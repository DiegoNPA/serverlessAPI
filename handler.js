'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { v4: uuidv4 } = require('uuid');

const dataTable = process.env.DATA_TABLE;

//crear la respuesta al callback
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

//Obtener todos los items de la tabla
module.exports.getAllItems = (event, context, callback) => {

  const params = {
    TableName: dataTable
  }

  return db
    .scan(params)
    .promise()
    .then((res) => {
      if(res.Items){
        callback(null, response(200, res.Items));
      }
      else{
        callback(null, response(404, { error: 'No hay items en la tabla' }))
      }
      
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};


//----------CLIENTES----------
//crear un solo cliente
module.exports.createClient = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);
  const clientId = uuidv4();

  if (
    !reqBody.clientName ||
    reqBody.clientName.trim() === '' ||
    !reqBody.lastName ||
    reqBody.lastName.trim() === '' ||
    !reqBody.phone ||
    !reqBody.gender ||
    reqBody.gender.trim() === ''
  ) {
    console.log(reqBody);
    return callback(
      null,
      response(400, {
        error: 'Los valores del cliente no pueden estar vacios'
      })
    );
  }


  const client = {
    PK: `CLIENT#${clientId}`,
    SK: `#METADATA#${clientId}`,
    type: "client",
    clientId: clientId,
    clientName: reqBody.clientName,
    lastName: reqBody.lastName,
    phone: reqBody.phone,
    gender: reqBody.gender,
    cognitoId: reqBody.cognitoId
  };

  return db
    .put({
      TableName: dataTable,
      Item: client
    })
    .promise()
    .then(() => {
      callback(null, response(201, client));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};

//Obtener un cliente
module.exports.getClient = (event, context, callback) =>{
  
  const params = {
    Key: {
      PK: `CLIENT#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName:dataTable
  };

  console.log(params);

  return db.get(params).promise()
    .then(res => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Cliente no encontrado' }));
    })
    .catch(err => callback(null, response(err.statusCode, err)));
};

//Modificar un cliente
module.exports.updateClient = (event, context, callback) => {
  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const { clientName, lastName, phone, gender } = body;

  const params = {
    Key: {
      PK: `CLIENT#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName: dataTable,
    ConditionExpression: 'attribute_exists(PK)',
    UpdateExpression: 'SET clientName = :clientName, lastName = :lastName, phone = :phone, gender = :gender',
    ExpressionAttributeValues: {
      ':clientName': clientName,
      ':lastName': lastName,
      ':phone': phone,
      ':gender': gender
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Eliminar un cliente
module.exports.deleteClient = (event, context, callback) => {
  const params = {
    Key: {
      PK: `CLIENT#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName: dataTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'El cliente fue eliminado con exito' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//----------VENDEDORES----------
//Crear un vendedor
module.exports.createSeller = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);
  const sellerId = uuidv4();

  const seller = {
    PK: `SELLER#${sellerId}`,
    SK: `#METADATA#${sellerId}`,
    type: "seller",
    sellerId: sellerId,
    sellerName: reqBody.sellerName,
    description: reqBody.description,
    phone: reqBody.phone,
    category: reqBody.category,
    cognitoId: reqBody.cognitoId
  };

  return db
    .put({
      TableName: dataTable,
      Item: seller
    })
    .promise()
    .then(() => {
      callback(null, response(201, seller));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
}

//Obtener todos los vendedores
//GSI2
module.exports.getAllSellers = (event,context, callback) => {

  var params = {
    KeyConditionExpression: "#type = :type and begins_with(#PK, :PK)",
    ExpressionAttributeNames: { "#type": "type", "#PK": "PK" },
    ExpressionAttributeValues: {
      ":type": "seller",
      ":PK": "SELLER#"
    },
    TableName:dataTable,
    IndexName: "GSI2"
  }

  return db.query(params)
  .promise()
  .then((res)=> {
    if(res.Items){
      callback(null, response(200, res.Items));  
    }
    else{
      callback(null, response(404, { error: 'No existen vendedores' }));
    }
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Obtener un solo vendedor
module.exports.getSeller = (event, context, callback) =>{

  const params = {
    Key: {
      PK: `SELLER#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName:dataTable
  };

  console.log(params);

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Vendedor no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Modificar un vendedor
module.exports.updateSeller = (event, context, callback) => {

  const body = JSON.parse(event.body);
  const { sellerName, description, phone, category } = body;

  const params = {
    Key: {
      PK: `SELLER#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName: dataTable,
    ConditionExpression: 'attribute_exists(PK)',
    UpdateExpression: 'SET sellerName = :sellerName, description = :description, phone = :phone, category = :category',
    ExpressionAttributeValues: {
      ':sellerName': sellerName,
      ':description': description,
      ':phone': phone,
      ':category': category
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};


//Eliminar un vendedor
module.exports.deleteSeller = (event, context, callback) => {

  const params = {
    Key: {
      PK: `SELLER#${event.pathParameters.PK}`,
      SK: `#METADATA#${event.pathParameters.PK}`
    },
    TableName: dataTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'El vendedor fue eliminado con exito' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//----------PRODUCTOS----------
//Crear un producto
module.exports.createProduct = (event, context, callback) => {
  const sellerId = event.pathParameters.PK;
  const reqBody = JSON.parse(event.body);
  const prodId = uuidv4();

  const product = {
    PK: `SELLER#${sellerId}`,
    SK: `PRODUCT#${prodId}`,
    type: "product",
    sellerId: sellerId,
    productId: prodId,
    productName: reqBody.productName,
    description: reqBody.description,
    price: reqBody.price,
    category: reqBody.category,
    measureUnit: reqBody.measureUnit,
    stock: reqBody.stock
  };

  return db
    .put({
      TableName: dataTable,
      Item: product
    })
    .promise()
    .then(() => {
      callback(null, response(201, product));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};

//Obtener un producto
module.exports.getProduct = (event, context, callback) =>{

  const sellerId = event.pathParameters.PK;
  const productId = event.pathParameters.prodPK;

  const params = {
    Key: {
      PK: `SELLER#${sellerId}`,
      SK: `PRODUCT#${productId}`
    },
    TableName:dataTable
  };

  console.log(params);

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Producto no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Obtener todos los productos de un vendedor
module.exports.getProducts = (event, context, callback) =>{
  const sellerId = event.pathParameters.PK;

  var params = {
    KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":PK": `SELLER#${sellerId}`,
      ":SK": "PRODUCT#"
    },
    TableName:dataTable
  }

  return db.query(params)
  .promise()
  .then((res)=> {
    callback(null, response(200, res.Items));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Obtener todos los productos
//Se necesita el GSI2
module.exports.getAllProducts = (event, context, callback) => {

  var params = {
    KeyConditionExpression: "#type = :type and begins_with(#PK, :PK)",
    ExpressionAttributeNames: { "#type": "type", "#PK": "PK" },
    ExpressionAttributeValues: {
      ":type": "product",
      ":PK": "SELLER#"
    },
    TableName:dataTable,
    IndexName: "GSI2"
  }

  return db.query(params)
  .promise()
  .then((res)=> {
    if(res.Items){
      callback(null, response(200, res.Items));  
    }
    else{
      callback(null, response(404, { error: 'No existen productos' }));
    }
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Modificar un producto
module.exports.updateProduct = (event, context, callback) => {
  const body = JSON.parse(event.body);
  const { productName, description, price, category, measureUnit, stock } = body

  const params = {
    Key: {
      PK: `SELLER#${event.pathParameters.PK}`,
      SK: `PRODUCT#${event.pathParameters.prodPK}`
    },
    TableName: dataTable,
    ConditionExpression: 'attribute_exists(PK)',
    UpdateExpression: 'SET productName = :productName, description = :description, price = :price, category = :category, measureUnit = :measureUnit, stock = :stock',
    ExpressionAttributeValues: {
      ':productName': productName,
      ':description': description,
      ':price': price,
      ':category': category,
      ':measureUnit': measureUnit,
      ':stock': stock
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Eliminar un producto
module.exports.deleteProduct = (event, context, callback) => {

  const params = {
    Key: {
      PK: `SELLER#${event.pathParameters.PK}`,
      SK: `PRODUCT#${event.pathParameters.prodPK}`
    },
    TableName: dataTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'El producto fue eliminado con exito' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//----------PEDIDOS----------
//Crear un pedido
module.exports.createOrder = (event, context, callback) => {

  const clientId = event.pathParameters.PK;
  const sellerId = event.pathParameters.sellerPK;
  const productId = event.pathParameters.productPK;
  const reqBody = JSON.parse(event.body);
  const orderId = uuidv4();
  const paramName = "stock"
  let date = new Date(Date.now());
  let dateExp = new Date(Date.now() + (6.048e+8));

  const prodParams = {
    Key: {
      PK: `SELLER#${sellerId}`,
      SK: `PRODUCT#${productId}`
    },
    TableName:dataTable
  };

  db.get(prodParams).promise()
  .then(res => {
    if (res.Item){

      const clientParams = {
        Key: {
          PK: `CLIENT#${clientId}`,
          SK: `#METADATA#${clientId}`
        },
        TableName:dataTable
      }

      db.get(clientParams).promise()
        .then(resCli => {
          if (resCli.Item){

            const sellerParams = {
              Key: {
                PK: `SELLER#${sellerId}`,
                SK: `#METADATA#${sellerId}`
              },
              TableName:dataTable
            }

            db.get(sellerParams)
              .promise()
              .then((resSel) => {
                if (resSel.Item){

                  if(res.Item.stock > reqBody.quantity){
                    const order = {
                      PK: `CLIENT#${clientId}`,
                      SK: `ORDER#${orderId}`,
                      type: "order",
                      orderStatus: "Pending",
                      sellerId: `SELLER#${sellerId}`,
                      productId: productId,
                      startDate: date.toString(),
                      expDate: dateExp.toString(),
                      clientId: clientId,
                      orderId: orderId,
                      quantity: reqBody.quantity,
                      finalPrice: reqBody.quantity * res.Item.price,
                      productName: res.Item.productName,
                      sellerName: resSel.Item.sellerName,
                      clientName: `${resCli.Item.clientName} ${resCli.Item.lastName}`
                    };
              
                    const params = {
                      Key: {
                        PK: `SELLER#${sellerId}`,
                        SK: `PRODUCT#${productId}`
                      },
                      TableName: dataTable,
                      ConditionExpression: 'attribute_exists(PK)',
                      UpdateExpression: 'set ' + paramName + ' = :v',
                      ExpressionAttributeValues: {
                        ':v': res.Item.stock - reqBody.quantity
                      },
                      ReturnValues: 'ALL_NEW'
                    };
            
                    console.log('Updating');
                  
                    db
                      .update(params)
                      .promise()
                      .then((res) => {
                        db
                          .put({
                            TableName: dataTable,
                            Item: order
                          })
                          .promise()
                          .then(() => {
                            callback(null, response(201, order));
                          })
                          .catch((err) => response(null, response(err.statusCode, err)));
                      })
                      .catch((err) => callback(null, response(err.statusCode, err)));
              
                  }else{
                    callback(null, response(409, { error: 'La cantidad que desea pedir sobrepasa el stock de items que tiene el vendedor' }))
                  }


                }
                else callback(null, response(404, { error: 'Vendedor no encontrado' }));
              })
              .catch((err) => callback(null, response(err.statusCode, err)));

          }
          else callback(null, response(404, { error: 'Cliente no encontrado' }));
        })
        .catch(err => callback(null, response(err.statusCode, err)));

      
    }
    else{
      callback(null, response(404, { error: 'Producto no encontrado' }));
    }
  }).catch(err => response(null, response(err.statusCode, err)));
};

//Obtener un pedido para un cliente
module.exports.getOrderForClient = (event, context, callback) =>{

  const clientId = event.pathParameters.PK;
  const orderId = event.pathParameters.orderPK;

  const params = {
    Key: {
      PK: `CLIENT#${clientId}`,
      SK: `ORDER#${orderId}`
    },
    TableName:dataTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Pedido no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Obtener un pedido de un vendedor
//Se necesita el GSI1
module.exports.getOrderForSeller = (event, context, callback) => {

  const sellerId = event.pathParameters.PK;
  const orderId = event.pathParameters.orderPK;

  const params = {
    TableName: dataTable,
    IndexName: "GSI1",
    KeyConditionExpression: "#sellerId = :sellerId and #SK = :SK",
    ExpressionAttributeNames: { "#sellerId": "sellerId", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":sellerId": `SELLER#${sellerId}`,
      ":SK": `ORDER#${orderId}`
    }
  };

  console.log(params);

  return db
    .query(params)
    .promise()
    .then((res) => {
      if (res.Items[0]) {
        callback(null, response(200, res.Items[0]));
      }
      else callback(null, response(404, { error: 'Pedido no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
  };

//Obtener todos los pedidos de un cliente
module.exports.getOrdersForClient = (event, context, callback) => {

  const clientId = event.pathParameters.PK;

  var params = {
    KeyConditionExpression: "#PK = :PK and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":PK": `CLIENT#${clientId}`,
      ":SK": "ORDER#"
    },
    TableName:dataTable
  }

  return db.query(params)
  .promise()
  .then((res)=> {
    callback(null, response(200, res.Items));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Obtener todos los pedidos de un vendedor
//Se necesita el GSI1
module.exports.getOrdersForSeller = (event, context, callback) => {

  const sellerId = event.pathParameters.PK;

  var params = {
    KeyConditionExpression: "#sellerId = :sellerId and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#sellerId": "sellerId", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":sellerId": `SELLER#${sellerId}`,
      ":SK": "ORDER#"
    },
    TableName:dataTable,
    IndexName: "GSI1"
  }

  return db.query(params)
  .promise()
  .then((res)=> {
    if(res.Items[0]){
      callback(null, response(200, res.Items));  
    }
    else{
      callback(null, response(404, { error: 'El vendedor no tiene pedidos' }));
    }
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Modificar un pedido para un cliente
module.exports.updateOrderForClient = (event, context, callback) => {

  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    Key: {
      PK: `CLIENT#${event.pathParameters.PK}`,
      SK: `ORDER#${event.pathParameters.orderPK}`
    },
    TableName: dataTable,
    ConditionExpression: 'attribute_exists(PK)',
    UpdateExpression: 'set ' + paramName + ' = :v',
    ExpressionAttributeValues: {
      ':v': paramValue
    },
    ReturnValues: 'ALL_NEW'
  };

  return db
    .update(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Modificar un pedido para un vendedor
//Se necesita el GSI1
module.exports.updateOrderForSeller = (event, context, callback) => {

  const sellerId = event.pathParameters.PK;
  const orderId = event.pathParameters.orderPK;

  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    TableName: dataTable,
    IndexName: "GSI1",
    KeyConditionExpression: "#sellerId = :sellerId and #SK = :SK",
    ExpressionAttributeNames: { "#sellerId": "sellerId", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":sellerId": `SELLER#${sellerId}`,
      ":SK": `ORDER#${orderId}`
    }
  };

  db
    .query(params)
    .promise()
    .then((res) => {
      if (res.Items[0]) {

        const params1 = {
          Key: {
            PK: `CLIENT#${res.Items[0].clientId}`,
            SK: `ORDER#${orderId}`
          },
          TableName: dataTable,
          ConditionExpression: 'attribute_exists(PK)',
          UpdateExpression: 'set ' + paramName + ' = :v',
          ExpressionAttributeValues: {
            ':v': paramValue
          },
          ReturnValues: 'ALL_NEW'
        };
      
        db
          .update(params1)
          .promise()
          .then((resp) => {
            callback(null, response(200, resp.Attributes));
          })
          .catch((err) => callback(null, response(err.statusCode, err)));

      }
      else callback(null, response(404, { error: 'Pedido no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//Eliminar un pedido para un cliente
module.exports.deleteOrderForClient = (event, context, callback) => {

  const params = {
    Key: {
      PK: `CLIENT#${event.pathParameters.PK}`,
      SK: `ORDER#${event.pathParameters.orderPK}`
    },
    TableName: dataTable
  };

  
  db.get(params).promise()
  .then(res => {
    if (res.Item){
      db
        .delete(params)
        .promise()
        .then(() =>
          callback(null, response(200, { message: 'El pedido fue eliminado con exito' }))
        )
        .catch((err) => callback(null, response(err.statusCode, err)));
      }
      else{
        callback(null, response(404, { error: 'Pedido no encontrado' }));
      }
  }).catch(err => response(null, response(err.statusCode, err)));

}

//Eliminar un pedido para un vendedor
//Se necesita el GSI1
module.exports.deleteOrderForSeller = (event, context, callback) => {

  const sellerId = event.pathParameters.PK;
  const orderId = event.pathParameters.orderPK;

  const params = {
    TableName: dataTable,
    IndexName: "GSI1",
    KeyConditionExpression: "#sellerId = :sellerId and #SK = :SK",
    ExpressionAttributeNames: { "#sellerId": "sellerId", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":sellerId": `SELLER#${sellerId}`,
      ":SK": `ORDER#${orderId}`
    }
  };

  db
    .query(params)
    .promise()
    .then((res) => {
      if (res.Items[0]) {

        const params1 = {
          Key: {
            PK: `CLIENT#${res.Items[0].clientId}`,
            SK: `ORDER#${orderId}`
          },
          TableName: dataTable
        };

        console.log(params);
        console.log(params1);

        db.get(params1).promise()
        .then(resp => {
          if (resp.Item){
            db
              .delete(params1)
              .promise()
              .then(() =>
                callback(null, response(200, { message: 'El pedido fue eliminado con exito' }))
              )
              .catch((err) => callback(null, response(err.statusCode, err)));
            }
            else{
              callback(null, response(404, { error: 'Pedido no encontrado' }));
            }
        }).catch(err => response(null, response(err.statusCode, err)));

      }else callback(null, response(404, { error: 'Pedido no encontrado' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));

}

//Obtener usuario dado su cognitoId
//Se requiere el GSI3
module.exports.getUserByCognitoId = (event, context, callback) => {

  const cognitoId = event.pathParameters.cognitoId;

  const params = {
    TableName: dataTable,
    IndexName: "GSI3",
    KeyConditionExpression: "#cognitoId = :cognitoId and begins_with(#SK, :SK)",
    ExpressionAttributeNames: { "#cognitoId": "cognitoId", "#SK": "SK" },
    ExpressionAttributeValues: {
      ":cognitoId": `${event.pathParameters.cognitoId}`,
      ":SK": "#METADATA#"
    }
  }

  console.log(params);

  return db.query(params)
  .promise()
  .then((res)=> {
    if(res.Items[0]){
      callback(null, response(200, res.Items[0]));  
    }
    else{
      callback(null, response(404, { error: 'No existe el usuario' }));
    }
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
}