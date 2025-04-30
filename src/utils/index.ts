/**
 * 转换单个对象，处理字段名中的冒号和下划线
 */
/**
 * 将对象中的下划线命名属性转换为驼峰命名
 * @param item 要转换的对象或数组
 * @param options 配置选项
 * @returns 转换后的新对象
 */
export function transformItem<T = any>(
  item: T,
  options?: {
    /**
     * 需要排除转换的字段名列表
     */
    excludeKeys?: string[];
    /**
     * 需要特殊处理的字段名映射 {原字段名: 新字段名}
     */
    customKeyMap?: Record<string, string>;
    /**
     * 需要自动解析JSON字符串的字段名列表
     */
    parseJsonKeys?: string[];
  }
): T {
  if (item === null || item === undefined) {
    return item;
  }

  // 默认配置
  const defaultOptions = {
    excludeKeys: [],
    customKeyMap: {},
    parseJsonKeys: [],
  };

  const { excludeKeys, customKeyMap, parseJsonKeys } = {
    ...defaultOptions,
    ...options,
  };

  // 下划线转驼峰
  const toCamelCase = (str: string): string => {
    // 先检查自定义映射
    if (customKeyMap && customKeyMap[str]) {
      return customKeyMap[str];
    }
    
    // 排除字段不转换
    if (excludeKeys.includes(str)) {
      return str;
    }
    
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // 递归处理对象
  const transformObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(transformObject);
    }

    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const newObj: any = {};
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const newKey = toCamelCase(key);
          
          // 处理需要解析JSON字符串的字段
          if (parseJsonKeys.includes(key) && typeof obj[key] === 'string') {
            try {
              newObj[newKey] = transformObject(JSON.parse(obj[key]));
            } catch (e) {
              newObj[newKey] = obj[key]; // 解析失败保持原样
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
