export class Data {
    id: number = 1;
    parentClassId: number;
    computedId: number;
    stringParameterFound: boolean = false;
    primitiveTypesTab: string[] = [];
    otherTypesTab: string[] = [];
    namespacesTab: string[] = [];
    typesDictionary = {};
    entitiesIds = {};
    namespacesDictionary = {};

    mseFile: string = '(\n';
    famixPrefix = "FAMIX";
}
