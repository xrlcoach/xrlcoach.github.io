import json
import boto3
import decimal
import hashlib
import base64
from boto3.dynamodb.conditions import Key, Attr

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
        print('Params detected')        
        params = event["queryStringParameters"]
        print(params)
        if 'nrlClub' in params.keys():
            nrlClub = params['nrlClub']
            print(f'NrlClub param is {nrlClub}, querying table')
            resp = table.scan(
                FilterExpression=Attr('nrl_club').eq(nrlClub)
            )
        elif 'xrlTeam' in params.keys():
            xrlTeam = params['xrlTeam']
            print(f'XrlTeam param is {xrlTeam}, querying table')
            resp = table.scan(
                FilterExpression=Attr('xrl_team').eq(xrlTeam)
            )
        else:
            print("Couldn't recognise parameter")
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps({"message": "GET request parameter not recognised"})
            }
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
    if method == 'POST':
        responseItem = None
        print('Method is POST, checking operation')
        body = json.loads(event['body'])
        if body['operation'] == "pick_drop":
            print('Operation is pick/drop player, updating table...')
            try:
                response = table.update_item(
                    Key={
                        'player_name': body['player_name'],
                        'nrl_club': body['nrl_club']
                    },
                    UpdateExpression="set xrl_team=:x",
                    ExpressionAttributeValues={
                        ':x': body['xrl_team']
                    },
                    ReturnValues="UPDATED_NEW"
                )
                responseItem = response['Item'] 
                print(f"{body['player_name']}'s XRL team changed to {body['xrl_team']}")
            except Exception as e:
                print(e)
                return {
                    'statusCode': 504,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(e)
                }       
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(responseItem))
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