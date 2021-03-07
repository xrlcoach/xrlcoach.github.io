import json
import boto3
import decimal
import hashlib
import base64
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime, timedelta

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
# table = dynamodb.Table('players2020')
# lineups_table = dynamodb.Table('lineups2020')
# users_table = dynamodb.Table('users2020')
# transfers_table = dynamodb.Table('transfers2020')
# rounds_table = dynamodb.Table('rounds2020')
table = dynamodb.Table('XRL2021')

def lambda_handler(event, context):
    #Find request method
    method = event["httpMethod"]
    if method == 'GET':
        try:
            print('Method is get, checking for params')
            #If there is no query added to fetch GET request, scan the whole players table
            if not event["queryStringParameters"]:
                print('No params found, scanning table')
                start = datetime.now() + timedelta(hours=11)
                # resp = table.scan()['Items']
                resp = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM')
                )['Items']
                finish = datetime.now() + timedelta(hours=11)
                print(f'Table scan copmlete in {finish - start}. Returning json response')
            else:
                #If query string attached to GET request, determine request parameters and query players table accordingly
                print('Params detected')        
                params = event["queryStringParameters"]
                print(params)
                if 'nrlClub' in params.keys():
                    nrlClub = params['nrlClub']
                    print(f'NrlClub param is {nrlClub}, querying table')
                    # resp = table.scan(
                    #     FilterExpression=Attr('nrl_club').eq(nrlClub)
                    # )['Items']
                    resp = table.query(
                        IndexName='sk-data-index',
                        KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM'),
                        FilterExpression=Attr('nrl_club').eq(nrlClub)
                    )['Items']
                elif 'xrlTeam' in params.keys():
                    xrlTeam = params['xrlTeam']
                    print(f'XrlTeam param is {xrlTeam}, querying table')
                    if xrlTeam == 'Free Agents':
                        # resp = table.scan(
                        #     FilterExpression=Attr('xrl_team').not_exists() | Attr('xrl_team').eq('None') | Attr('xrl_team').eq('On Waivers') | Attr('xrl_team').eq('Pre-Waivers')
                        # )['Items']
                        resp = table.query(
                            IndexName='sk-data-index',
                            KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM#'),
                            FilterExpression=Attr('xrl_team').eq('None') | Attr('xrl_team').eq('On Waivers') | Attr('xrl_team').eq('Pre-Waivers')
                        )['Items']
                    else:
                        # resp = table.scan(
                        #     FilterExpression=Attr('xrl_team').eq(xrlTeam)
                        # )['Items']
                        resp = table.query(
                            IndexName='sk-data-index',
                            KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').eq('TEAM#' + xrlTeam)
                        )['Items']
                elif 'playerId' in params.keys():
                    player_id = params['playerId']
                    print(f'PlayerId param is {player_id}, querying table')
                    # resp = table.get_item(
                    #     Key={
                    #         'player_id': player_id
                    #     }
                    # )['Item']
                    resp = table.get_item(Key={
                        'pk': 'PLAYER#' + player_id,
                        'sk': 'PROFILE'
                    })['Item']
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
    if method == 'POST':
        try:
            #POST request should contain an 'operation' property in the request body
            print('Method is POST, checking operation')
            body = json.loads(event['body'])
            print("Operation is " + body['operation'])
            # users = users_table.scan()['Items']
            # active_user = [u for u in users if u['team_short'] == body['xrl_team']][0]
            active_user = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').eq('NAME#' + body['xrl_team'])
            )['Items'][0]
            print(f"Active user is {active_user['username']}")
            # rounds = rounds_table.scan(
            #     FilterExpression=Attr('active').eq(True)
            # )['Items']
            rounds = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').eq('ACTIVE#true')
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
                    # player_record = table.get_item(
                    #     Key={
                    #         'player_id': player['player_id']
                    #     }
                    # )['Item']
                    player_record = table.get_item(
                        Key={
                            'pk': 'PLAYER#' + player['player_id'],
                            'sk': 'PROFILE'
                        }
                    )['Item']
                    if 'xrl_team' in player_record.keys() and player_record['xrl_team'] != 'None':
                        raise Exception(f"{player['player_name']} has already signed for another XRL team.")
                for player in body['players']:
                    #Update player's XRL team
                    # table.update_item(
                    #     Key={
                    #         'player_id': player['player_id'],
                    #     },
                    #     UpdateExpression="set xrl_team=:x",
                    #     ExpressionAttributeValues={
                    #         ':x': body['xrl_team']
                    #     }
                    # )
                    table.update_item(
                        Key={
                            'pk': 'PLAYER#' + player['player_id'],
                            'sk': 'PROFILE'
                        },
                        UpdateExpression="set #D=:d, xrl_team=:x",
                        ExpressionAttributeNames={
                            '#D': 'data'
                        },
                        ExpressionAttributeValues={
                            ':d': 'TEAM#' + body['xrl_team'],
                            ':x': body['xrl_team']
                        }
                    )
                    # transfers_table.put_item(
                    #     Item={
                    #         'transfer_id': active_user['username'] + '_' + str(datetime.now()),
                    #         'user': active_user['username'],                        
                    #         'datetime': datetime.now().strftime("%c"),
                    #         'type': 'Scoop',
                    #         'round_number': round_number,
                    #         'player_id': player['player_id']
                    #     }
                    # ) 
                    if round_number > 1:
                        transfer_date = datetime.now() + timedelta(hours=11)
                        table.put_item(
                            Item={
                                'pk': 'TRANSFER#' + active_user['username'] + str(transfer_date),
                                'sk': 'TRANSFER',
                                'data': 'ROUND#' + str(round_number),
                                'user': active_user['username'],                        
                                'datetime': transfer_date.strftime("%c"),
                                'type': 'Scoop',
                                'round_number': round_number,
                                'player_id': player['player_id']
                            }
                        ) 
                    print(f"{player['player_name']}'s' XRL team changed to {body['xrl_team']}")                
                print('Adjusting waiver order')
                #Sort users by waiver rank
                users = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
                )['Items']
                waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
                #Remove the user who just scooped a player and put them at the bottom of the list
                waiver_order.remove(active_user)
                waiver_order.append(active_user)
                #Update everyone's waiver rank to reflect change
                for rank, user in enumerate(waiver_order, 1):
                    table.update_item(
                        Key={
                            'pk': 'USER#' + user['username'],
                            'sk': 'DETAILS'
                        },
                        UpdateExpression="set waiver_rank=:wr",
                        ExpressionAttributeValues={
                            ':wr': rank
                        }
                    )
                #Add the number of player's scooped to the user's 'players_picked' property 
                print(f"Adding {len(body['players'])} to {active_user['username']}'s picked players count")
                table.update_item(
                    Key={
                        'pk': 'USER#' + user['username'],
                        'sk': 'DETAILS'
                    },
                    UpdateExpression="set players_picked=players_picked+:v",
                    ExpressionAttributeValues={
                        ':v': len(body['players'])
                    }
                )
                print("Count updated")                   
            if body['operation'] == 'drop':
                #Iterate through players to be dropped
                # not_in_progress_rounds = table.query(
                #     IndexName='sk-data-index',
                #     KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').begins_with('ACTIVE'),
                #     FilterExpression=Attr('in_progress').eq(False)
                # )['Items']
                next_round_number = round_number if not active_round['in_progress'] else round_number + 1
                for player in body['players']:
                    # player_to_drop = table.get_item(
                    #     Key={
                    #         'player_id': player['player_id']
                    #     }
                    # )['Item']
                    # lineups_table.delete_item(
                    #     Key={
                    #         'name+nrl+xrl+round': player_to_drop['player_name'] + ';' + player_to_drop['nrl_club'] + ';' + active_user['team_short'] + ';' + str(next_round_number)
                    #     }
                    # )

                    #Remove them from any lineup for next round
                    table.delete_item(Key={
                        'pk': 'PLAYER#' + player['player_id'],
                        'sk': 'LINEUP#' + str(next_round_number)
                    })
                    #Update their XRL team property to 'On Waivers'. This prevents them from being scooped until
                    #they clear the next round of waivers
                    new_team = 'TEAM#None' if round_number == 1 else 'TEAM#On Waivers'
                    table.update_item(
                        Key={
                            'pk': 'PLAYER#' + player['player_id'],
                            'sk': 'PROFILE'
                        },
                        UpdateExpression="set #D=:d, xrl_team=:x",
                        ExpressionAttributeNames={
                            '#D': 'data'
                        },
                        ExpressionAttributeValues={
                            ':d': new_team,
                            ':x': 'On Waivers'
                        }
                    )
                    #Add record to transfers table
                    transfer_date = datetime.now() + timedelta(hours=11)
                    table.put_item(
                        Item={
                            'pk': 'TRANSFER#' + active_user['username'] + str(transfer_date),
                            'sk': 'TRANSFER',
                            'data': 'ROUND#' + str(round_number),
                            'user': active_user['username'],                        
                            'datetime': transfer_date.strftime("%c"),
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