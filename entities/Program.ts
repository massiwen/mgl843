class Program {
    Id : number;
    Description : string;

    constructor(id: number, description: string) {
        this.Id = id;
        this.Description = description;
    }
}

interface Grade {
    a: number
    b: string
}