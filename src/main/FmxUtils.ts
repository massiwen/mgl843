export class FmxUtils {

    convertTsTypeToJava(tsType: string): string {
        var javaType: string;
        switch (tsType) {
            case 'string':
                javaType = 'String';
                break;
            case 'number':
                javaType = 'int';
                break;
            case 'boolean':
                javaType = 'bool';
                break;
            case 'void':
                javaType = 'void';
                break;
            default:
                javaType = 'Unknown';
        }
        return javaType;
    }
}

