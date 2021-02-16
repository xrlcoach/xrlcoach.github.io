import json
import boto3
from boto3.dynamodb.conditions import Key, Attr
import decimal

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
# round_table = dynamodbResource.Table('rounds2020')
table = dynamodbResource.Table('XRL2020')

def lambda_handler(event, context):
    try:
        method = event['httpMethod']
        if method == 'GET':
            if not event["queryStringParameters"]:
                # resp = table.scan()
                data = []
                for i in range(1, 22):
                    round_object = table.get_item(
                        Key={'pk': 'ROUND#' + str(i), 'sk': 'STATUS'}
                    )['Item']
                    round_object['fixtures'] = table.query(
                        KeyConditionExpression=Key('pk').eq('ROUND#' + str(i)) & Key('sk').begins_with('FIXTURE')
                    )['Items']
                    data += round_object
                return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(replace_decimals(data))
                }
            print('Params detected')        
            params = event["queryStringParameters"]
            print(params)
            round_number = params['round']
            # resp = round_table.get_item(
            #     Key={
            #         'round_number': int(round_number)
            #     }
            # )
            data = table.get_item(
                Key={'pk': 'ROUND#' + str(round_number), 'sk': 'STATUS'}
            )['Item']
            data['fixtures'] = table.query(
                KeyConditionExpression=Key('pk').eq('ROUND#' + str(round_number)) & Key('sk').begins_with('FIXTURE')
            )['Items']
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(data))
            }
    except Exception as e:
        return {
            'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": str(e)})
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