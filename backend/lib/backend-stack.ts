import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create DynamoDB Table (using 'billId' as partition key)
    const billsTable = new dynamodb.Table(this, "LifeHubBillsTable", {
      tableName: "LifeHub-RecurringBills",
      partitionKey: { name: "billId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for permanent production data
    });

    // 2. Create the Unified Lambda Function
    const billsLambda = new lambda.Function(this, "LifeHubBillsHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/bills"),
      environment: {
        TABLE_NAME: billsTable.tableName,
      },
    });

    // Automatically grant Lambda read/write access to the DynamoDB table
    billsTable.grantReadWriteData(billsLambda);

    // 3. Create HTTP API Gateway with automatic CORS preflight
    const httpApi = new apigw.HttpApi(this, "LifeHubHttpApi", {
      corsPreflight: {
        allowOrigins: ["*"], // Allows requests from both CloudFront and Localhost seamlessly
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
        ],
      },
    });

    // 4. Map the /bills route to the Lambda function for GET, POST, and DELETE methods
    const lambdaIntegration = new apigwIntegrations.HttpLambdaIntegration(
      "BillsIntegration",
      billsLambda,
    );

    httpApi.addRoutes({
      path: "/bills",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
    });

    // 5. Output the new API endpoint URL to the terminal after deployment
    new cdk.CfnOutput(this, "ApiEndpointUrl", {
      value: httpApi.url ?? "API URL generation failed",
      description: "Paste this URL into your App.jsx API_BASE variable",
    });
  }
}
