import json
import boto3
import decimal

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
round_table = dynamodbResource.Table('rounds2020')

def lambda_handler(event, context):
    method = event['httpMethod']
    if method == 'GET':
        if not event["queryStringParameters"]:
            resp = round_table.scan()
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(resp['Items']))
            }
        print('Params detected')        
        params = event["queryStringParameters"]
        print(params)
        round_number = params['round']
        resp = round_table.get_item(
            Key={
                'round_number': int(round_number)
            }
        )
        return {
            'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps(replace_decimals(resp['Item']))
        }


def replace_decimals(obj):
    if isinstance(obj, list):
        for i in range(len(obj)):
            obj[i] = replace_decimals(obj[i])
        return obj
    elif isinstance(obj, dict):
        for k in obj.keys():
            obj[k] = replace_decimals(obj[k])
        return obj
    elif isinstance(obj, decimal.Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj