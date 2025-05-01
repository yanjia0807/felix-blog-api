export function transformItem<T = any>(
  item: T,
  options?: {
    excludeKeys?: string[];
    customKeyMap?: Record<string, string>;
    parseJsonKeys?: string[];
  }
): T {
  if (item === null || item === undefined) {
    return item;
  }

  const defaultOptions = {
    excludeKeys: [],
    customKeyMap: {},
    parseJsonKeys: [],
  };

  const { excludeKeys, customKeyMap, parseJsonKeys } = {
    ...defaultOptions,
    ...options,
  };

  const toCamelCase = (str: string): string => {
    if (customKeyMap && customKeyMap[str]) {
      return customKeyMap[str];
    }
    
    if (excludeKeys.includes(str)) {
      return str;
    }
    
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  const transformObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(transformObject);
    }

    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const newObj: any = {};
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const newKey = toCamelCase(key);
          
          if (parseJsonKeys.includes(key) && typeof obj[key] === 'string') {
            try {
              newObj[newKey] = transformObject(JSON.parse(obj[key]));
            } catch (e) {
              newObj[newKey] = obj[key]; 
            }
          } else {
            newObj[newKey] = transformObject(obj[key]);
          }
        }
      }
      
      return newObj;
    }
    
    return obj;
  };

  return transformObject(item);
}
