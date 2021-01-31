import json
import boto3
import decimal
import hashlib
import base64
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('players2020')
lineups_table = dynamodb.Table('lineups2020')
users_table = dynamodb.Table('users2020')
transfers_table = dynamodb.Table('transfers2020')
rounds_table = dynamodb.Table('rounds2020')

def lambda_handler(event, context):
    #Find request method
    method = event["httpMethod"]
    if method == 'GET':
        print('Method is get, checking for params')
        #If there is no query added to fetch GET request, scan the whole players table
        if not event["queryStringParameters"]:
            print('No params found, scanning table')
            start = datetime.now()
            resp = table.scan()['Items']
            finish = datetime.now()
            print(f'Table scan copmlete in {finish - start}. Returning json response')
        else:
            #If query string attached to GET request, determine request parameters and query players table accordingly
            print('Params detected')        
            params = event["queryStringParameters"]
            print(params)
            if 'nrlClub' in params.keys():
                nrlClub = params['nrlClub']
                print(f'NrlClub param is {nrlClub}, querying table')
                resp = table.scan(
                    FilterExpression=Attr('nrl_club').eq(nrlClub)
                )['Items']
            elif 'xrlTeam' in params.keys():
                xrlTeam = params['xrlTeam']
                print(f'XrlTeam param is {xrlTeam}, querying table')
                if xrlTeam == 'Free Agents':
                    resp = table.scan(
                        FilterExpression=Attr('xrl_team').not_exists() | Attr('xrl_team').eq('None') | Attr('xrl_team').eq('On Waivers') | Attr('xrl_team').eq('Pre-Waivers')
                    )['Items']
                else:
                    resp = table.scan(
                        FilterExpression=Attr('xrl_team').eq(xrlTeam)
                    )['Items']
            elif 'playerId' in params.keys():
                player_id = params['playerId']
                print(f'PlayerId param is {player_id}, querying table')
                resp = table.get_item(
                    Key={
                        'player_id': player_id
                    }
                )['Item']
            #If query parameters present but are not any of the above, send back error message
            else:
                print("Couldn't recognise parameter")
                resp = {"error": "GET request parameter not recognised"}
        print('Returning respnse')
        #Return response
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps(replace_decimals(resp))
            }
    if method == 'POST':
        try:
            #POST request should contain an 'operation' property in the request body
            print('Method is POST, checking operation')
            body = json.loads(event['body'])
            print("Operation is " + body['operation'])
            users = users_table.scan()['Items']
            active_user = [u for u in users if u['team_short'] == body['xrl_team']][0]
            print(f"Active user is {active_user['username']}")
            rounds = rounds_table.scan(
                FilterExpression=Attr('active').eq(True)
            )['Items']
            round_number = max([r['round_number'] for r in rounds])
            active_round = [r for r in rounds if r['round_number'] == round_number][0]
            print(f"Current round: {round_number}.")
            if body['operation'] == "scoop":
                if not active_round['scooping']:
                    raise Exception("Scooping is not permitted at this time")
                #Iterate through all players being scooped
                for player in body['players']:
                    #Check if player is available to be scooped
                    player_record = table.get_item(
                        Key={
                            'player_id': player['player_id']
                        }
                    )['Item']
                    if 'xrl_team' in player_record.keys() and player_record['xrl_team'] != 'None':
                        raise Exception(f"{player['player_name']} has already signed for another XRL team.")
                for player in body['players']:
                    #Update player's XRL team
                    table.update_item(
                        Key={
                            'player_id': player['player_id'],
                        },
                        UpdateExpression="set xrl_team=:x",
                        ExpressionAttributeValues={
                            ':x': body['xrl_team']
                        }
                    )
                    transfers_table.put_item(
                        Item={
                            'transfer_id': active_user['username'] + '_' + str(datetime.now()),
                            'user': active_user['username'],                        
                            'datetime': datetime.now().strftime("%c"),
                            'type': 'Scoop',
                            'round_number': round_number,
                            'player_id': player['player_id']
                        }
                    ) 
                    print(f"{player['player_name']}'s' XRL team changed to {body['xrl_team']}")                
                print('Adjusting waiver order')
                #Sort users by waiver rank
                waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
                #Remove the user who just scooped a player and put them at the bottom of the list
                waiver_order.remove(active_user)
                waiver_order.append(active_user)
                #Update everyone's waiver rank to reflect change
                for rank, user in enumerate(waiver_order, 1):
                    users_table.update_item(
                        Key={
                            'username': user['username']
                        },
                        UpdateExpression="set waiver_rank=:wr",
                        ExpressionAttributeValues={
                            ':wr': rank
                        }
                    )
                #Add the number of player's scooped to the user's 'players_picked' property 
                print(f"Adding {len(body['players'])} to {active_user['username']}'s picked players count")
                users_table.update_item(
                    Key={
                        'username': active_user['username']
                    },
                    UpdateExpression="set players_picked=players_picked+:v",
                    ExpressionAttributeValues={
                        ':v': len(body['players'])
                    }
                )
                print("Count updated")                   
            if body['operation'] == 'drop':
                #Iterate through players to be dropped
                for player in body['players']:
                    #Update their XRL team property to 'On Waivers'. This prevents them from being scooped until
                    #they clear the next round of waivers
                    table.update_item(
                            Key={
                                'player_id': player['player_id'],
                            },
                            UpdateExpression="set xrl_team=:x",
                            ExpressionAttributeValues={
                                ':x': 'On Waivers'
                            }
                        )
                    transfers_table.put_item(
                        Item={
                            'transfer_id': active_user['username'] + '_' + str(datetime.now()),
                            'user': active_user['username'],                        
                            'datetime': datetime.now().strftime("%c"),
                            'type': 'Drop',
                            'round_number': round_number,
                            'player_id': player['player_id']
                        }
                    )
                    print(f"{player['player_name']} put on waivers")
            return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps({"message": "Player team updates successful"})
                }
        except Exception as e:
                print(e)
                return {
                    'statusCode': 500,
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