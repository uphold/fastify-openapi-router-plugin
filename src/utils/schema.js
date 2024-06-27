export const addPropertyToSchema = (schema, properties, required) => {
  for (const key in properties) {
    const property = properties[key];

    // Respect the previous definition of the property.
    if (!schema.properties[key]) {
      schema.properties[key] = property;
    }

    // Make the property required.
    if (required && !schema.required.includes(key)) {
      schema.required.push(key);
    }
  }
};

export const removeAttributesFromSchema = (schema, attributes) => {
  if (!attributes || !Array.isArray(attributes)) {
    return;
  }

  for (const prop in schema) {
    if (attributes.includes(prop)) {
      delete schema[prop];
    } else if (typeof schema[prop] === 'object') {
      removeAttributesFromSchema(schema[prop], attributes);
    }
  }
};