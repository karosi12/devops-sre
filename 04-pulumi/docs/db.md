## To get list of available AWS database engine versions

# For PostgreSQL
aws rds describe-db-engine-versions --engine postgres --query 'DBEngineVersions[*].EngineVersion' --output table

# For MySQL  
aws rds describe-db-engine-versions --engine mysql --query 'DBEngineVersions[*].EngineVersion' --output table
