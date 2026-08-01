export interface KinesisComponentArgs {
  shardCount?: number;
  retentionPeriodHours?: number;
  tags?: Record<string, string>;
}

// kinesis dat stream, firehose, and analytics types can be added here in future
