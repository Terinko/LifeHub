import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create the DynamoDB Table
    const billsTable = new dynamodb.Table(this, "BillsTable", {
      partitionKey: { name: "billId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Stays in the free tier!
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev: deletes table if we delete the stack
    });

    // 2. Define the Single-Purpose Lambdas
    const getBillsLambda = new NodejsFunction(this, "GetBillsFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/getBills.js"), // We will create this file next
      environment: { TABLE_NAME: billsTable.tableName }, // Pass table name as env variable
    });

    const createBillLambda = new NodejsFunction(this, "CreateBillFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/createBill.js"),
      environment: { TABLE_NAME: billsTable.tableName },
    });

    const deleteBillLambda = new NodejsFunction(this, "DeleteBillFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/deleteBill.js"),
      environment: { TABLE_NAME: billsTable.tableName },
    });

    // 3. Enterprise Security: Principle of Least Privilege
    billsTable.grantReadData(getBillsLambda);
    billsTable.grantWriteData(createBillLambda);
    billsTable.grantWriteData(deleteBillLambda);

    // 4. Create the API Gateway (REST API)
    const api = new apigateway.RestApi(this, "LifeHubApi", {
      restApiName: "LifeHub Enterprise API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // We will lock this down to CloudFront later
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // 5. Wire the API Routes to the Lambdas
    const billsResource = api.root.addResource("bills");
    billsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getBillsLambda),
    );
    billsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createBillLambda),
    );
    billsResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(deleteBillLambda),
    );
  }
}
