import boto3
from boto3.dynamodb.conditions import Key, Attr
import decimal
import json

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('stats2020')

def lambda_handler(event, context):
    try:
        method = event['httpMethod']
        if method == 'GET':
            print('Method is get, checking for params')
            if not event["queryStringParameters"]:
                print('No params found, scanning table')
                resp = table.scan()
                print('Table scanned, formulatin json response')
                data = resp['Items']
            else: 
                print('Params detected')        
                params = event["queryStringParameters"]
                print(params)
                if 'playerId' in params.keys():
                    playerId = params['playerId']
                    if 'round' in params.keys():
                        round_number = params['round']
                        print(f'Querying table for PlayerId {playerId} in round {round_number}')
                        resp = table.get_item(
                            Key={
                                'player_id': playerId,
                                'round_number': round_number
                            }
                        )
                        data = resp['Item']                        
                    else:
                        print(f'Querying table for PlayerId {playerId}')
                        resp = table.scan(
                            FilterExpression=Attr('player_id').eq(playerId)
                        )
                        data = resp['Items']
                elif 'nrlClub' in params.keys():
                    nrlClub = params['nrlClub']
                    if 'round' in params.keys():
                        round_number = params['round']
                        print(f'Querying table for {nrlClub} players in round {round_number}')
                        resp = table.scan(
                            FilterExpression=Attr('nrl_club').eq(nrlClub) & Attr('round_number').eq(round_number)
                        )
                        if 'LastEvaluatedKey' in resp.keys():
                            resp2 = table.scan(
                                FilterExpression=Attr('nrl_club').eq(nrlClub) & Attr('round_number').eq(round_number),
                                ExclusiveStartKey=resp['LastEvaluatedKey']
                            )
                            data += resp2['Items']
                    else:
                        print(f'Querying table for {nrlClub} players in all rounds')
                        resp = table.scan(
                            FilterExpression=Attr('nrlClub').eq(nrlClub)
                        )
                    data = resp['Items']
                elif 'round' in params.keys():
                    round_number = params['round']
                    print(f'Querying table for all stats from round {round_number}')
                    resp = table.scan(
                        FilterExpression=Attr('round_number').eq(round_number)
                    )
                    data = resp['Items']
                    if 'LastEvaluatedKey' in resp.keys():
                        resp2 = table.scan(
                            FilterExpression=Attr('round_number').eq(round_number),
                            ExclusiveStartKey=resp['LastEvaluatedKey']
                        )
                        data += resp2['Items']
                    
                else:
                    print("Couldn't recognise parameter")
                    data = {"error": "Couldn't recognise parameter"}
            print('Table queried, returning json')
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