
export const dbConnections = [
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
    ['localhost', 'test', 'test', 'test'],//EXAMPLE
  ];
  
  export const serverMapping = {
    // Patagonia Strike servers
    ps: {
      0: 0,  // PUB NORMAL
      1: 1,  // PUB FRUTA
      2: 5,  // DUST2
      3: 6,  // FAKA
    },
    tcs: {
      0: 2,  // TCS MAIN
      1: 3,  // TCS FRUTA
    },
    brick: {
      0: 4,  // BRICK MAIN
    },
    gaming: {
      0: 7,  // GAMING GROUP
    },
    vs: {
      0: 8,  // VIEJA SCHOOL
    },
    cg: {
      0: 11, // CLASSIC GAMERS
    },
    test: {
      0: 12, // TEST SERVER
    }
  };
  
  export const vipPrices = [0.22, 0.33, 0.44, 0.66, 0.88, 1.10, 1.55, 2.0, 0.6];
  
  export const vipNames = [
    "Vip x2",
    "Vip x3",
    "Vip x4",
    "Vip x6",
    "Vip x8",
    "Vip x10",
    "Vip x15",
    "Vip x20",
    "Administrador"
  ];
  
  export const vipNumber = [2, 3, 4, 6, 8, 10, 15, 20, 500];
  
  export const serverNames = [
    ["PUBLICO", "PUB FRUTA", "", "PUBLICO II"], // PS
    ["PUBLICO"], // TCS
    ["PUBLICO", "AUTOMIX #1", "AUTOMIX #2"], // BRICK
    ["PUBLICO"], // GAMING
    ["PUBLICO"], // CG
    ["PUBLICO"] // VS
  ];
  
  export const serverPrefix = [
    "[PS]",
    "[TCS]",
    "[BG]",
    "[GG]",
    "[CG]",
    "[VS]"
  ];
  
  export const discountPercentages = [0, 20, 30, 40, 45];
  export const discountValue = [1, 2, 3, 6, 12];
  export const discountCount = ["un mes", "dos meses", "tres meses", "seis meses", "un año"];
  
  export const getDbIdForServer = (svname: string, svnum: number): number => {
    if (!svname || svnum === undefined) {
      return -1;
    }
    
    const serverGroup = serverMapping[svname];
    if (!serverGroup) {
      return -1;
    }
    
    return serverGroup[svnum] !== undefined ? serverGroup[svnum] : -1;
  };
  
  export const getDbConnectionById = (dbId: number): string[] | null => {
    if (dbId < 0 || dbId >= dbConnections.length) {
      return null;
    }
    
    return dbConnections[dbId];
  };