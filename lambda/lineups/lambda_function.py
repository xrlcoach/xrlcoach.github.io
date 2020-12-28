import json
import boto3
import base64
from boto3.dynamodb.conditions import Key, Attr
import decimal


dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
lineup_table = dynamodbResource.Table('lineups2020')
user_table = dynamodbResource.Table('users2020')
round_table = dynamodbResource.Table('rounds2020')


def lambda_handler(event, context):
    method = event["httpMethod"]
    print(f"Method is {method}")
    id_token = ''
    if 'Authorization' in event['headers'].keys():
        id_token = event['headers']['Authorization']
        payload = id_token.split('.')[1]
        decoded = base64.b64decode(payload + '=======')
        username = json.loads(decoded)['cognito:username']
        print(f"User: {username}")
        resp = user_table.get_item(Key={'username': username})
        user = resp['Item']
        team_short = user['team_short']
        print(f"XRL Team: {team_short}")
        resp = round_table.scan(
            FilterExpression=Attr('in_progress').eq(False)
        )
        round_number = min([r['round_number'] for r in resp['Items']])
        print(f"Round Number: {round_number}")
        existing_lineup = lineup_table.scan(
                FilterExpression=Attr('xrl_team').eq(team_short) & Attr('round_number').eq(str(round_number))
                )
    if method == 'GET':
        if id_token != '':
            if len(existing_lineup['Items']) > 0:
                print("Existing lineup found. Returning player list.")
            else:
                print("No lineup found")
            return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(existing_lineup['Items']))
            }
        else:
            params = event["queryStringParameters"]
            print(params)
            team = params['team']
            round_number = params['round']
            print(f'Specific lineup requested is {team}, Round {round_number}. Querying table..')
            resp = lineup_table.scan(
                FilterExpression=Attr('xrl_team').eq(team) & Attr('round_number').eq(round_number)
            )
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
        lineup = json.loads(event['body'])
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
        print("Writing lineup to table")        
        for player in existing_lineup['Items']:
            lineup_table.delete_item(
                Key={
                    'name+nrl+xrl+round': player['player_name'] + ';' + player['nrl_club'] + ';' + team_short + ';' + str(round_number)
                }
            )
        for player in lineup:
            lineup_table.put_item(
                Item={
                    'name+nrl+xrl+round': player['player_name'] + ';' + player['nrl_club'] + ';' + team_short + ';' + str(round_number),
                    'player_id': player['player_id'],
                    'player_name': player['player_name'],
                    'nrl_club': player['nrl_club'],
                    'xrl_team': team_short,
                    'round_number': str(round_number),
                    'position_specific': player['position'],
                    'position_general': player['positiion_general'],
                    'position_number': position_numbers[player['position']],
                    'captain': player['captain'],
                    'vice': player['vice'],
                    'kicker': player['kicker'],
                    'backup_kicker': player['backupKicker'],
                    'played_nrl': False,
                    'played_xrl': False
                }
            )
        print("DB write complete")
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps({"message": "Lineup saved successfully"})
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