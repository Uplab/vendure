import {
    getNamedType,
    GraphQLSchema,
    OperationDefinitionNode,
    TypeInfo,
    visit,
    visitWithTypeInfo,
} from 'graphql';

/**
 * @description
 * Walks a GraphQL operation AST and builds a map of argument name → input type name
 * for all field arguments in the operation.
 *
 * Used by multiple interceptors that need to inspect mutation variable types
 * at the GraphQL layer (e.g. CustomFieldProcessingInterceptor, InputValidationInterceptor).
 */
export function getArgumentMap(
    operation: OperationDefinitionNode,
    schema: GraphQLSchema,
): { [inputName: string]: string } {
    const typeInfo = new TypeInfo(schema);
    const map: { [inputName: string]: string } = {};

    const visitor = {
        enter(node: any) {
            if (node.kind === 'Field') {
                const fieldDef = typeInfo.getFieldDef();
                if (fieldDef) {
                    for (const arg of fieldDef.args) {
                        map[arg.name] = getNamedType(arg.type).name;
                    }
                }
            }
        },
    };

    visit(operation, visitWithTypeInfo(typeInfo, visitor));
    return map;
}
