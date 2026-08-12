import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // FRONTEND INFRASTRUCTURE
    // ==========================================

    // 1. Create a secure S3 Bucket to hold the React code
    const websiteBucket = new s3.Bucket(this, "LifeHubWebsiteBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Create a CloudFront CDN to serve the app globally via HTTPS
    const distribution = new cloudfront.Distribution(
      this,
      "LifeHubDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        // This tells CloudFront to route all traffic to index.html (required for React routers later)
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      },
    );

    // 3. Deploy the compiled Vite app (the 'dist' folder) to the S3 bucket
    new s3deploy.BucketDeployment(this, "DeployLifeHubWebsite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../dist"))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ["/*"], // Tells CloudFront to clear its cache on a new deployment
    });

    // 4. Print the URL to the console when deployment finishes
    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Your LifeHub Mobile App URL",
    });

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
    // 1. Create the API with global CORS preflight enabled
    const api = new apigateway.RestApi(this, "LifeHubApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    // 2. Create the /bills resource explicitly
    const billsResource = api.root.addResource("bills");

    // 3. Attach your Lambda integrations to /bills
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
