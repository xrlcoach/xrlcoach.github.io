import json
import boto3
import base64
from boto3.dynamodb.conditions import Key, Attr
import decimal


dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
# lineup_table = dynamodbResource.Table('lineups2020')
# user_table = dynamodbResource.Table('users2020')
# round_table = dynamodbResource.Table('rounds2020')
table = dynamodbResource.Table('XRL2021')


def lambda_handler(event, context):
    try:
        method = event["httpMethod"]
        print(f"Method is {method}")        
            
        if method == 'GET':
            params = event["queryStringParameters"]
            if params and 'team' in params.keys():
                print(params)
                team = params['team']
                round_number = params['round']
                print(f'Specific lineup requested is {team}, Round {round_number}. Querying table..')                
                resp = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').eq('TEAM#' + team)
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(resp['Items']))
                }
            else:
                id_token = event['headers']['Authorization']
                payload = id_token.split('.')[1]
                decoded = base64.b64decode(payload + '=======')
                username = json.loads(decoded)['cognito:username']
                print(f"User: {username}")
                resp = table.get_item(Key={
                    'pk': 'USER#' + username,
                    'sk': 'DETAILS'
                })
                user = resp['Item']
                team_short = user['team_short']
                print(f"XRL Team: {team_short}")                
                resp = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').begins_with('ACTIVE'),
                    FilterExpression=Attr('in_progress').eq(False)
                )
                round_number = min([r['round_number'] for r in resp['Items']])
                print(f"Round Number: {round_number}")
                existing_lineup = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').eq('TEAM#' + team_short)
                )
                if len(existing_lineup['Items']) > 0:
                    print("Existing lineup found. Returning player list.")
                else:
                    print("No lineup found")
                return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(replace_decimals(existing_lineup['Items']))
                }                
                
        if method == 'POST':
            id_token = event['headers']['Authorization']
            payload = id_token.split('.')[1]
            decoded = base64.b64decode(payload + '=======')
            username = json.loads(decoded)['cognito:username']
            print(f"User: {username}")
            resp = table.get_item(Key={
                'pk': 'USER#' + username,
                'sk': 'DETAILS'
            })
            user = resp['Item']
            team_short = user['team_short']
            print(f"XRL Team: {team_short}")                
            resp = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').begins_with('ACTIVE'),
                FilterExpression=Attr('in_progress').eq(False)
            )
            round_number = min([r['round_number'] for r in resp['Items']])
            print(f"Round Number: {round_number}")
            body = json.loads(event['body'])
            operation = body['operation']
            print("Operation is " + operation)           
            if operation == 'set':
                existing_lineup = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').eq('TEAM#' + team_short)
                )
                lineup = json.loads(body['players'])
                print("Lineup: " + str(lineup))
                position_numbers = {
                    "fullback": 1,
                    "winger1": 2,
                    "centre1": 3,
                    "centre2": 4,
                    "winger2": 5,
                    "five_eighth": 6,
                    "halfback": 7,
                    "prop1": 8,
                    "hooker": 9,
                    "prop2": 10,
                    "row1": 11,
                    "row2": 12,
                    "lock": 13,
                    "int1": 14,
                    "int2": 15,
                    "int3": 16,
                    "int4": 17,
                    }
                print("Removing old lineup")     
                with table.batch_writer() as batch:   
                    for player in existing_lineup['Items']:                       
                        
                        batch.delete_item(
                            Key={
                                'pk': player['pk'],
                                'sk': player['sk']
                            }
                        )
                print("Writing new lineup")
                with table.batch_writer() as batch:
                    for player in lineup:
                        batch.put_item(
                            Item={
                                'pk': 'PLAYER#' + player['player_id'],
                                'sk': 'LINEUP#' + str(round_number),
                                'data': 'TEAM#' + team_short,
                                'player_id': player['player_id'],
                                'player_name': player['player_name'],
                                'nrl_club': player['nrl_club'],
                                'xrl_team': team_short,
                                'round_number': str(round_number),
                                'position_specific': player['position'],
                                'position_general': player['position_general'],
                                'second_position': player['second_position'],
                                'position_number': position_numbers[player['position']],
                                'captain': player['captain'],
                                'captain2': player['captain2'],
                                'vice': player['vice'],
                                'kicker': player['kicker'],
                                'backup_kicker': player['backup_kicker'],
                                'played_nrl': False,
                                'played_xrl': False,
                                'score': 0
                            }
                        )                        
                print("DB write complete")
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"message": "Lineup saved successfully"})
                    }
    except Exception as e:
        return {
            'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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