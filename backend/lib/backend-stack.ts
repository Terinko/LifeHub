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

    // Grant Lambda permission to edit the database
    billsTable.grantReadWriteData(billsLambda);

    // ==========================================
    // 3. API ROUTING (API Gateway)
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

    // Route 2: /bills/{id} (Handles URLs like /bills/12345)
    httpApi.addRoutes({
      path: "/bills/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
    });

    // ==========================================
    // 4. FRONTEND HOSTING (S3 & CloudFront)
    // ==========================================
    const websiteBucket = new s3.Bucket(this, "LifeHubFrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Cleans up the bucket if the stack is deleted
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
          // Add this new block to handle the S3 Access Denied errors
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          // Keep your existing 404 block just in case
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

    // Automate the upload of the React files to S3
    new s3deploy.BucketDeployment(this, "DeployLifeHubWebsite", {
      // This assumes your frontend folder is next to your backend folder in your repo
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../dist"))],
      destinationBucket: websiteBucket,
      distribution: distribution, // This automatically clears the CloudFront cache!
      distributionPaths: ["/*"],
    });
  }
}
