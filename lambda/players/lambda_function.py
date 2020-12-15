import json
import boto3
import decimal
import hashlib
import base64

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('players2020')

def lambda_handler(event, context):
    method = event["httpMethod"]
    if method == 'GET':
        print('Method is get, checking for params')
        if not event["queryStringParameters"]:
            print('No params found, scanning table')
            resp = table.scan()
            print('Table scanned, returning json response')
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(resp['Items']))
            }
        print('Params detected, finding team param')
        team = event["queryStringParameters"]["team"]
        print(f'Team param is {team}, querying table')
        resp = table.query(
            KeyConditionExpression=Key('nrl_club').eq(team)
        )
        print('Table queried, returning json')
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(resp['Items']))
            }
    """ if method == 'POST':
        id_token = event['headers']['Authorization']
        print(id_token)        
        payload = id_token.split('.')[1]
        print(payload)
        decoded = base64.b64decode(payload + '=======')
        print(decoded)
        user = json.loads(decoded)['cognito:username']
        print(user)
        
        try:
            response = table.get_item(Key={'username': user})
            print(response['Item'])        
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(response['Item']))
            }
        except Exception as e:
            print(e)       """

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