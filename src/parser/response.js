export const parseResponse = (route, operation) => {
  if (!operation.responses) {
    return;
  }

  for (const httpCode in operation.responses) {
    const response = operation.responses[httpCode];

    // Pick only responses with content.
    if (response.content) {
      route.schema.response[httpCode] = response;
    }
  }
};
