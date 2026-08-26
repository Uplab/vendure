import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

import { UserInputError } from '../../common/error/errors';
import { getArgumentMap } from '../common/graphql-argument-map';
import { parseContext } from '../common/parse-context';
import { requiredInputFields } from '../common/required-input-fields';

/**
 * @description
 * Interceptor that validates string fields on GraphQL mutation inputs are not blank
 * (empty or whitespace-only). Uses a hand-curated registry of fields that are
 * business-required — description fields and system-populated defaults are excluded.
 *
 * @since 3.8
 */
@Injectable()
export class InputValidationInterceptor implements NestInterceptor {
    private readonly registeredInputTypes: Set<string>;

    constructor() {
        this.registeredInputTypes = new Set(Object.keys(requiredInputFields));
    }

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
        const parsedContext = parseContext(context);

        if (!parsedContext.isGraphQL) {
            return next.handle();
        }

        const { operation, schema } = parsedContext.info;
        if (operation.operation !== 'mutation') {
            return next.handle();
        }

        const gqlExecutionContext = GqlExecutionContext.create(context);
        const variables = gqlExecutionContext.getArgs();
        const inputTypeNames = getArgumentMap(operation, schema);

        for (const [inputName, typeName] of Object.entries(inputTypeNames)) {
            if (this.registeredInputTypes.has(typeName) && variables[inputName]) {
                const spec = requiredInputFields[typeName];
                const inputValues = Array.isArray(variables[inputName])
                    ? variables[inputName]
                    : [variables[inputName]];
                for (const inputValue of inputValues) {
                    this.validateInput(typeName, spec, inputValue);
                }
            }
        }

        return next.handle();
    }

    private validateInput(
        inputTypeName: string,
        spec: { fields?: string[]; translations?: string[] },
        inputValue: Record<string, any>,
    ) {
        // Validate direct fields
        if (spec.fields) {
            for (const fieldName of spec.fields) {
                const value = inputValue[fieldName];
                if (typeof value === 'string' && value.trim() === '') {
                    throw new UserInputError('error.field-cannot-be-blank', {
                        fieldName,
                    });
                }
            }
        }

        // Validate translation fields
        if (spec.translations && Array.isArray(inputValue.translations)) {
            for (const translation of inputValue.translations) {
                if (translation && typeof translation === 'object') {
                    for (const fieldName of spec.translations) {
                        const value = translation[fieldName];
                        if (typeof value === 'string' && value.trim() === '') {
                            throw new UserInputError('error.field-cannot-be-blank', {
                                fieldName,
                            });
                        }
                    }
                }
            }
        }
    }
}
