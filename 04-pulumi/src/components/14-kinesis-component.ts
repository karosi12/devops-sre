import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { KinesisComponentArgs } from '../utils/types/kinesis';

export class KinesisComponent extends pulumi.ComponentResource {
  public readonly streamName: pulumi.Output<string>;
  public readonly streamArn: pulumi.Output<string>;

  constructor(
    name: string,
    args: KinesisComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('infra:aws:KinesisComponent', name, {}, opts);

    const stream = new aws.kinesis.Stream(
      `${name}-stream`,
      {
        shardCount: args.shardCount ?? 1,
        retentionPeriod: args.retentionPeriodHours ?? 24,
        streamModeDetails: {
          streamMode: 'ON_DEMAND', // Alternatively, use 'PROVISIONED' if shardCount is specified
        },
        tags: args.tags,
      },
      { parent: this },
    );

    const firehoseBucket = new aws.s3.Bucket(`${name}-firehose-bucket`, {
      tags: args.tags,
    });

    const firehoseRole = new aws.iam.Role(`${name}-firehose-role`, {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'firehose.amazonaws.com',
      }),
    });

    new aws.iam.RolePolicy('firehose-policy', {
      role: firehoseRole.id,
      policy: firehoseBucket.arn.apply((arn) =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                's3:PutObject',
                's3:AbortMultipartUpload',
                's3:GetBucketLocation',
              ],
              Resource: `${arn}/*`,
            },
          ],
        }),
      ),
    });

    const firehose = new aws.kinesis.FirehoseDeliveryStream(
      `${name}-firehose`,
      {
        destination: 'extended_s3',
        extendedS3Configuration: {
          bucketArn: firehoseBucket.arn,
          roleArn: firehoseRole.arn,

          prefix: 'events/!{timestamp:yyyy/MM/dd}/',
          bufferingInterval: 60,
          bufferingSize: 5,
          compressionFormat: 'GZIP',
        },
      },
      { parent: this },
    );

    const analyticsRole = new aws.iam.Role(`${name}-analytics-role`, {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'kinesisanalytics.amazonaws.com',
      }),
    });

    new aws.iam.RolePolicy(`${name}-analytics-policy`, {
      role: analyticsRole.id,
      policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "kinesis:DescribeStream",
              "kinesis:GetShardIterator",
              "kinesis:GetRecords",
              "kinesis:ListStreams"
            ],
            "Resource": "${stream.arn}"
          },
          {
            "Effect": "Allow",
            "Action": [
              "cloudwatch:PutMetricData"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            "Resource": "*"
          } 
        ]
      }`,
    });

    const analyticsApp = new aws.kinesisanalyticsv2.Application(
      `${name}-analytics-app`,
      {
        runtimeEnvironment: 'SQL-1_0',
        serviceExecutionRole: analyticsRole.arn,

        applicationConfiguration: {
          applicationCodeConfiguration: {
            codeContent: {
              textContent: `
            CREATE OR REPLACE STREAM DESTINATION_SQL_STREAM (
              event_type VARCHAR(64),
              event_count INTEGER
            );

            CREATE OR REPLACE PUMP STREAM_PUMP AS
              INSERT INTO DESTINATION_SQL_STREAM
              SELECT event_type, COUNT(*) AS event_count
              FROM SOURCE_SQL_STREAM_001
              GROUP BY event_type;
          `,
            },
            codeContentType: 'PLAINTEXT',
          },
          sqlApplicationConfiguration: {
            input: {
              namePrefix: 'SOURCE_SQL_STREAM',

              kinesisStreamsInput: {
                resourceArn: stream.arn,
                // roleArn: analyticsRole.arn,
              },

              inputSchema: {
                recordColumns: [
                  {
                    name: 'event_id',
                    sqlType: 'VARCHAR(64)',
                    mapping: '$.event_id',
                  },
                  {
                    name: 'event_type',
                    sqlType: 'VARCHAR(64)',
                    mapping: '$.event_type',
                  },
                  {
                    name: 'event_timestamp',
                    sqlType: 'TIMESTAMP',
                    mapping: '$.event_timestamp',
                  },
                ],

                recordFormat: {
                  recordFormatType: 'JSON',
                  mappingParameters: {
                    jsonMappingParameters: {
                      recordRowPath: '$',
                    },
                  },
                },

                recordEncoding: 'UTF-8',
              },
            },
          },
        },
      },
      { parent: this },
    );

    this.streamName = stream.name;
    this.streamArn = stream.arn;

    this.registerOutputs({
      streamName: this.streamName,
      streamArn: this.streamArn,
      firehoseName: firehose.name,
      analyticsAppName: analyticsApp.name,
    });
  }
}
