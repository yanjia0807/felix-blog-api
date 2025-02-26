/**
 * 将下划线形式的字段名转为驼峰
 * 示例: "created_by_id" → "createdById"
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * 转换单个对象，处理字段名中的冒号和下划线
 */
export const transformItem = <T extends Record<string, any>>(item: T): any => {
  const result: any = {};

  // 遍历原始对象的所有字段
  for (const rawKey in item) {
    if (!Object.prototype.hasOwnProperty.call(item, rawKey)) continue;

    const value = item[rawKey];
    const camelKey = toCamelCase(rawKey); // 驼峰化字段名
    const keyParts = camelKey.split(":"); // 按冒号分割层级

    let current = result; // 当前处理的嵌套层级
    let parent: any = null; // 父级对象引用
    let parentKey: string = ""; // 父级字段名

    // 逐级处理字段层级
    for (let i = 0; i < keyParts.length; i++) {
      const part = keyParts[i];
      const isLastPart = i === keyParts.length - 1;

      // 如果当前层级已被设为 null，停止处理
      if (current[part] === null) break;

      // 处理最末级字段
      if (isLastPart) {
        // 规则: 如果当前字段是 id 且值为 null，将父级设为 null
        if (part === "id" && value === null && parent !== null) {
          parent[parentKey] = null;
        } else {
          current[part] = value;
        }
      }
      // 处理中间层级
      else {
        parent = current;
        parentKey = part;

        // 如果当前层级不存在或不是对象，创建新对象
        if (typeof current[part] !== "object" || current[part] === null) {
          current[part] = {};
        }

        current = current[part]; // 进入下一层级
      }
    }
  }

  return result;
};
