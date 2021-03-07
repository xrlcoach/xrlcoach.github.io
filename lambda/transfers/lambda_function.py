import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime, timedelta
import json
import decimal

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
# squads_table = dynamodbResource.Table('players2020')
# users_table = dynamodbResource.Table('users2020')
# transfers_table = dynamodbResource.Table('transfers2020')
# trades_table = dynamodbResource.Table('trades2020')
# players_table = dynamodbResource.Table('players2020')
# rounds_table = dynamodbResource.Table('rounds2020')
# waivers_table = dynamodbResource.Table('waivers2020')
# lineups_table = dynamodbResource.Table('lineups2020')
table = dynamodbResource.Table('XRL2021')

def lambda_handler(event, context):
    method = event["httpMethod"]
    print("Method is " + method)
    if method == 'GET':
        try:
            print("Scanning transfers table")
            # resp = transfers_table.scan()
            resp = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('TRANSFER') & Key('data').begins_with('ROUND#')
            )
            print("Returning data")
            return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(replace_decimals(resp['Items']))
                }
        except Exception as e:
            print("ERROR: " + str(e))
            return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps({"error": str(e)})
                }
    if method == 'POST':
        body = json.loads(event['body'])
        operation = body['operation']
        print("Operation is " + operation)
        if operation == 'get_round_transfers':
            try:
                resp = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('TRANSFER') & Key('data').eq('ROUND#' + str(body['round_number']))
                )
                print("Returning data")
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(resp['Items']))
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
        if operation == 'update_preferences':
            try:                
                username = body['username']
                players = body['preferences']
                provisional_drop = None if body['provisional_drop'] == 'None' else body['provisional_drop']
                print(f"Updating {username}'s waiver preferences to: {str(players)}")
                # users_table.update_item(
                #     Key={
                #         'username': username
                #     },
                #     UpdateExpression="set waiver_preferences=:p, provisional_drop=:pd",
                #     ExpressionAttributeValues={
                #         ':p': players,
                #         ':pd': provisional_drop
                #     }
                # )
                table.update_item(
                    Key={
                        'pk': 'USER#' + username,
                        'sk': 'DETAILS'
                    },
                    UpdateExpression="set waiver_preferences=:p, provisional_drop=:pd",
                    ExpressionAttributeValues={
                        ':p': players,
                        ':pd': provisional_drop
                    }
                )
                print("Update complete")
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": username + "'s waiver preferences updated"})
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
        if operation == 'trade_offer':
            try:
                print('Writing offer to trades table')
                # trades_table.put_item(
                #     Item={
                #         'offer_id': body['offered_by'] + '_' + str(datetime.now()),
                #         'datetime': datetime.now().strftime('%c'),
                #         'offered_by': body['offered_by'],
                #         'offered_to': body['offered_to'],
                #         'players_offered': body['players_offered'],
                #         'players_wanted': body['players_wanted'],
                #         'powerplays_offered': body['powerplays_offered'],
                #         'powerplays_wanted': body['powerplays_wanted'],
                #         'offer_status': 'Pending'
                #     }
                # )
                offer_time = datetime.now() + timedelta(hours=11)
                table.put_item(
                    Item={
                        'pk': 'OFFER#' + body['offered_by'] + '#' + str(offer_time),
                        'sk': 'OFFER',
                        'data': 'TO#' + body['offered_to'],
                        'offer_id': body['offered_by'] + '#' + str(offer_time),
                        'datetime': offer_time.strftime('%c'),
                        'offered_by': body['offered_by'],
                        'offered_to': body['offered_to'],
                        'players_offered': body['players_offered'],
                        'players_wanted': body['players_wanted'],
                        'powerplays_offered': body['powerplays_offered'],
                        'powerplays_wanted': body['powerplays_wanted'],
                        'offer_status': 'Pending'
                    }
                )
                table.put_item(
                    Item={
                        'pk': 'USER#' + body['offered_to'],
                        'sk': 'OFFER#' + body['offered_by'] + '#' + str(offer_time),
                        'data': 'FROM#' + body['offered_by']
                    }
                )
                table.put_item(
                    Item={
                        'pk': 'USER#' + body['offered_by'],
                        'sk': 'OFFER#' + body['offered_by'] + '#' + str(offer_time),
                        'data': 'TO#' + body['offered_to']
                    }
                )
                print('Sending message to user')
                # user_offered_by = users_table.get_item(Key={'username': body['offered_by']})["Item"]
                # user_offered_to = users_table.get_item(Key={'username': body['offered_to']})['Item']
                user_offered_by = table.get_item(Key={'pk': 'USER#' + body['offered_by'], 'sk': 'DETAILS'})["Item"]
                user_offered_to = table.get_item(Key={'pk': 'USER#' + body['offered_to'], 'sk': 'DETAILS'})['Item']
                user_offered_to['inbox'].append({
                    'sender': user_offered_by['team_name'],
                    'datetime': offer_time.strftime('%c'),
                    'subject': 'Trade Offer',
                    'message': user_offered_by['team_name'] + " has offered you a trade. You can view the offer in the Transfer Centre."
                })
                # users_table.update_item(
                #     Key={'username': user_offered_to['username']},
                #     UpdateExpression="set inbox=:i",
                #     ExpressionAttributeValues={':i': user_offered_to['inbox']}
                # )
                table.update_item(
                    Key={'pk': user_offered_to['pk'], 'sk': 'DETAILS'},
                    UpdateExpression="set inbox=:i",
                    ExpressionAttributeValues={':i': user_offered_to['inbox']}
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "trade offer recorded"})
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
        if operation == 'get_user_offers':
            try:
                print(f"Getting {body['username']}'s trade offers from database.")
                # offers = trades_table.scan(
                #     FilterExpression=Attr('offered_by').eq(body['username']) | Attr('offered_to').eq(body['username'])
                # )['Items']
                offers = []
                offer_fks = [o['sk'] for o in table.query(
                    KeyConditionExpression=Key('pk').eq('USER#' + body['username']) & Key('sk').begins_with('OFFER#')
                )['Items']]
                for fk in offer_fks:
                    offers.append(table.get_item(Key={
                        'pk': fk,
                        'sk': 'OFFER'
                    })['Item'])
                print('Returning data.')
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(offers))
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
        if operation == 'withdraw_trade':
            try:
                table.update_item(
                    Key={
                        'pk': body['offer_id'],
                        'sk': 'OFFER'
                    },
                    UpdateExpression="set offer_status=:w",
                    ExpressionAttributeValues={':w': 'Withdrawn'}
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "Trade withdrawn"})
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }

        if operation == 'process_trade':
            try:
                #Get active round and next round
                rounds = table.query(
                    IndexName='sk-data-index',
                    KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').eq('ACTIVE#true')
                )['Items']
                round_number = max([r['round_number'] for r in rounds])
                active_round = [r for r in rounds if r['round_number'] == round_number][0]
                next_round_number = round_number if not active_round['in_progress'] else round_number + 1
                #Get outcome and offer
                outcome = body['outcome']
                offer = table.get_item(Key={
                    'pk': body['offer_id'],
                    'sk': 'OFFER'
                })['Item']
                #Reject if offer has already been processed
                if offer['offer_status'] != 'Pending':
                    raise Exception("Trade has already been processed/withdrawn.")
                #Retrieve users involved
                user_offered_by = table.get_item(Key={'pk': 'USER#' + offer['offered_by'], 'sk': 'DETAILS'})["Item"]
                user_offered_to = table.get_item(Key={'pk': 'USER#' + offer['offered_to'], 'sk': 'DETAILS'})['Item']
                transfer_date = datetime.now() + timedelta(hours=11)

                if outcome == 'Accepted':
                    print(f"{user_offered_to} has accepted the trade offer from {user_offered_by}. Checking squad sizes.")
                    user_offered_by_squad = table.query(
                        IndexName='sk-data-index',
                        KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').eq('TEAM#' + user_offered_by['team_short'])
                    )['Items']
                    user_offered_to_squad = table.query(
                        IndexName='sk-data-index',
                        KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').eq('TEAM#' + user_offered_to['team_short'])
                    )['Items']
                    if len(user_offered_by_squad) - len(offer['players_offered']) + len(offer['players_wanted']) > 18:
                        raise Exception(f"The trade would result in {user_offered_by['team_name']} having too many players.")
                    if len(user_offered_to_squad) - len(offer['players_wanted']) + len(offer['players_offered']) > 18:
                        raise Exception(f"The trade would result in {user_offered_to['team_name']} having too many players.")
                    print("Squad sizes ok. Checking powerplays.")
                    if user_offered_by['powerplays'] < offer['powerplays_offered']:
                        raise Exception(f"{user_offered_by['team_name']} don't have enough powerplays to make good on this deal.")
                    if user_offered_to['powerplays'] < offer['powerplays_wanted']:
                        raise Exception(f"You don't have enough powerplays to make good on this deal.")
                    pending_trades = table.query(
                        IndexName='sk-data-index',
                        KeyConditionExpression=Key('sk').eq('OFFER') & Key('data').begins_with('TO#'),
                        FilterExpression=Attr('offer_status').eq('Pending')
                    )['Items']
                    pending_trades = [t for t in pending_trades if t['offer_id'] != offer['offer_id']]
                    for player_id in offer['players_offered']:
                        pending_trades = [t for t in pending_trades if t['offer_status'] == 'Pending']
                        table.update_item(
                            Key={
                                'pk': 'PLAYER#' + player_id,
                                'sk': 'PROFILE'
                            },
                            UpdateExpression="set #D=:d, xrl_team=:x",
                            ExpressionAttributeNames={
                                '#D': 'data'
                            },
                            ExpressionAttributeValues={
                                ':d': 'TEAM#' + user_offered_to['team_short'],
                                ':x': user_offered_to['team_short']
                            }
                        )
                        # player_to_drop = table.get_item(
                        #     Key={
                        #         'pk': 'PLAYER#' + player_id,
                        #         'sk': 'PROFILE'
                        #     }
                        # )['Item']
                        table.delete_item(
                            Key={
                                'pk': 'PLAYER#' + player_id,
                                'sk': 'LINEUP#' + str(next_round_number)
                            }
                        )
                        for trade in pending_trades:
                            if player_id in trade['players_offered'] or player_id in trade['players_wanted']:
                                print(f"Player with ID {player_id} was part of offer with ID {trade['offer_id']}. Withdrawing that trade offer.")
                                trade['offer_status'] = 'Withdrawn'
                                table.update_item(
                                    Key={
                                        'pk': trade['pk'],
                                        'sk': trade['sk']
                                    },
                                    UpdateExpression="set offer_status=:c",
                                    ExpressionAttributeValues={':c': 'Withdrawn'}
                                )
                                withdrawn_offer_user = table.get_item(Key={'pk': 'USER#' + trade['offered_by'], 'sk': 'DETAILS'})["Item"]
                                withdrawn_offer_target = table.get_item(Key={'pk': 'USER#' + trade['offered_to'], 'sk': 'DETAILS'})["Item"]
                                withdrawn_offer_user['inbox'].append({
                                    "sender": 'XRL Admin',
                                    "datetime": transfer_date.strftime("%c"),
                                    "subject": "Trade Offer Withdrawn",
                                    "message": f"Your trade offer to {withdrawn_offer_target['team_name']} was withdrawn because one of the players signed for another club."
                                })
                                table.update_item(
                                    Key={'pk': withdrawn_offer_user['pk'], 'sk': 'DETAILS'},
                                    UpdateExpression="set inbox=:i",
                                    ExpressionAttributeValues={':i': withdrawn_offer_user['inbox']}
                                )
                        table.put_item(
                            Item={
                                'pk': 'TRANSFER#' + user_offered_by['username'] + str(transfer_date),
                                'sk': 'TRANSFER',
                                'data': 'ROUND#' + str(round_number),
                                'user': user_offered_to['username'],                        
                                'datetime': transfer_date.strftime("%c"),
                                'type': 'Trade',
                                'seller': user_offered_by['username'],
                                'round_number': round_number,
                                'player_id': player_id
                            }
                        )
                    for player_id in offer['players_wanted']:
                        pending_trades = [t for t in pending_trades if t['offer_status'] == 'Pending']
                        table.update_item(
                            Key={
                                'pk': 'PLAYER#' + player_id,
                                'sk': 'PROFILE'
                            },
                            UpdateExpression="set #D=:d, xrl_team=:x",
                            ExpressionAttributeNames={
                                '#D': 'data'
                            },
                            ExpressionAttributeValues={
                                ':d': 'TEAM#' + user_offered_by['team_short'],
                                ':x': user_offered_by['team_short']
                            }
                        )
                        # player_to_drop = players_table.get_item(
                        #     Key={
                        #         'player_id': player_id
                        #     }
                        # )['Item']
                        table.delete_item(
                            Key={
                                'pk': 'PLAYER#' + player_id,
                                'sk': 'LINEUP#' + str(next_round_number)
                            }
                        )
                        for trade in pending_trades:
                            if player_id in trade['players_offered'] or player_id in trade['players_wanted']:
                                print(f"Player with ID {player_id} was part of offer with ID {trade['offer_id']}. Withdrawing that trade offer.")
                                trade['offer_status'] = 'Withdrawn'
                                table.update_item(
                                    Key={
                                        'pk': trade['pk'],
                                        'sk': trade['sk']
                                    },
                                    UpdateExpression="set offer_status=:c",
                                    ExpressionAttributeValues={':c': 'Withdrawn'}
                                )
                                withdrawn_offer_user = table.get_item(Key={'pk': 'USER#' + trade['offered_by'], 'sk': 'DETAILS'})["Item"]
                                withdrawn_offer_target = table.get_item(Key={'pk': 'USER#' + trade['offered_to'], 'sk': 'DETAILS'})["Item"]
                                withdrawn_offer_user['inbox'].append({
                                    "sender": 'XRL Admin',
                                    "datetime": transfer_date.strftime("%c"),
                                    "subject": "Trade Offer Withdrawn",
                                    "message": f"Your trade offer to {withdrawn_offer_target['team_name']} was withdrawn because one of the players signed for another club."
                                })
                                table.update_item(
                                    Key={'pk': withdrawn_offer_user['pk'], 'sk': 'DETAILS'},
                                    UpdateExpression="set inbox=:i",
                                    ExpressionAttributeValues={':i': withdrawn_offer_user['inbox']}
                                )
                        table.put_item(
                            Item={
                                'pk': 'TRANSFER#' + user_offered_to['username'] + str(transfer_date),
                                'sk': 'TRANSFER',
                                'data': 'ROUND#' + str(round_number),
                                'user': user_offered_by['username'],                        
                                'datetime': transfer_date.strftime("%c"),
                                'type': 'Trade',
                                'seller': user_offered_to['username'],
                                'round_number': round_number,
                                'player_id': player_id
                            }
                        )
                    print("Players transferred. Updating powerplays.")
                    table.update_item(
                        Key={'pk': 'USER#' + user_offered_by['username'], 'sk': 'DETAILS'},
                        UpdateExpression="set powerplays=powerplays+:pp",
                        ExpressionAttributeValues={
                            ':pp': offer['powerplays_wanted'] - offer['powerplays_offered']                           
                        }
                    )
                    table.update_item(
                        Key={'pk': 'USER#' + user_offered_to['username'], 'sk': 'DETAILS'},
                        UpdateExpression="set powerplays=powerplays+:pp",
                        ExpressionAttributeValues={
                            ':pp': offer['powerplays_offered'] - offer['powerplays_wanted']
                        }
                    )                 
                    user_offered_by_message = {
                        "sender": user_offered_to['team_name'],
                        "datetime": transfer_date.strftime("%c"),
                        "subject": "Trade Accepted",
                        "message": "You've got a deal."
                    }
                else:
                    print(f"{user_offered_to} has rejected the trade offer from {user_offered_by}.")
                    user_offered_by_message = {
                        "sender": user_offered_to['team_name'],
                        "datetime": transfer_date.strftime("%c"),
                        "subject": "Trade Rejected",
                        "message": "Tell him he's dreaming."
                    }
                print('Updating offer status to ' + outcome)
                table.update_item(
                        Key={
                            'pk': offer['pk'],
                            'sk': offer['sk']
                        },
                        UpdateExpression="set offer_status=:s",
                        ExpressionAttributeValues={':s': outcome}
                    )
                print('Sending message to offering user.')
                user_offered_by['inbox'].append(user_offered_by_message)
                table.update_item(
                    Key={'pk': 'USER#' + user_offered_by['username'], 'sk': 'DETAILS'},
                    UpdateExpression="set inbox=:i",
                    ExpressionAttributeValues={':i': user_offered_by['inbox']}
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "Trade processed"})
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
        if operation == 'get_waiver_reports':
            try:
                data = table.query(
                    KeyConditionExpression=Key('pk').eq('WAIVER') & Key('sk').begins_with('REPORT')
                )['Items']
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(data)
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



