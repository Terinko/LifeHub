import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dotenv from "dotenv";
import { Duration } from "aws-cdk-lib";

// Load environment variables from .env file
dotenv.config();

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // 1. DATABASE (DynamoDB)
    // ==========================================
    const billsTable = new dynamodb.Table(this, "BillsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const kitchenTable = new dynamodb.Table(this, "KitchenTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const pokerTable = new dynamodb.Table(this, "PokerTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==========================================
    // 2. BACKEND LOGIC (Lambda)
    // ==========================================
    const billsLambda = new lambda.Function(this, "LifeHubBillsHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/bills"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: billsTable.tableName,
      },
    });

    const kitchenLambda = new lambda.Function(this, "KitchenHandler", {
      runtime: lambda.Runtime.NODEJS_24_X,
      code: lambda.Code.fromAsset("lambda/kitchen"),
      handler: "kitchen.handler",
      environment: {
        TABLE_NAME: kitchenTable.tableName,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        WALMART_PUBLISHER_ID: process.env.WALMART_PUBLISHER_ID || "",
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const pokerLambda = new lambda.Function(this, "PokerHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/poker"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: pokerTable.tableName,
      },
    });

    // Grant Lambda permission to edit the database
    billsTable.grantReadWriteData(billsLambda);
    kitchenTable.grantReadWriteData(kitchenLambda);
    pokerTable.grantReadWriteData(pokerLambda);

    // ==========================================
    // 3. API ROUTING (API Gateway v2 HTTP API)
    // ==========================================
    const httpApi = new apigw.HttpApi(this, "LifeHubHttpApi", {
      corsPreflight: {
        allowHeaders: ["*"],
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
      },
    });

    const billsIntegration = new HttpLambdaIntegration(
      "BillsIntegration",
      billsLambda,
    );

    const kitchenIntegration = new HttpLambdaIntegration(
      "KitchenIntegration",
      kitchenLambda,
    );

    const pokerIntegration = new HttpLambdaIntegration(
      "PokerIntegration",
      pokerLambda,
    );

    // Route 1: /bills
    httpApi.addRoutes({
      path: "/bills",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
    });

    // Route 2: /bills/{id}
    httpApi.addRoutes({
      path: "/bills/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
    });

    // Route 3: /kitchen
    httpApi.addRoutes({
      path: "/kitchen",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
    });

    // Route 4: /kitchen/{id}
    httpApi.addRoutes({
      path: "/kitchen/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
    });

    // Route 5: /poker
    httpApi.addRoutes({
      path: "/poker",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
    });

    httpApi.addRoutes({
      path: "/poker/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
    });

    // ==========================================
    // 4. FRONTEND HOSTING (S3 & CloudFront)
    // ==========================================
    const websiteBucket = new s3.Bucket(this, "LifeHubFrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(
      this,
      "LifeHubFrontendDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      },
    );

    // ==========================================
    // 5. TERMINAL OUTPUTS
    // ==========================================
    new cdk.CfnOutput(this, "ApiEndpointUrl", {
      value: httpApi.url!,
      description: "The base URL for your API Gateway",
    });

    new cdk.CfnOutput(this, "FrontendURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Your Live React App Website Link",
    });

    new cdk.CfnOutput(this, "S3BucketName", {
      value: websiteBucket.bucketName,
      description: "Upload your React dist folder to this S3 bucket",
    });
    new s3deploy.BucketDeployment(this, "DeployLifeHubWebsite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../dist"))],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    });
  }
}
