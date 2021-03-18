import time
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import os
import stat
from decimal import Decimal
from botocore.errorfactory import ClientError
import math
import csv


import sys

log = open('/home/james/Projects/XRL/functions/logs/update_stats.log', 'a')
sys.stdout = log
start = datetime.now()
print(f"Script executing at {start}")

# dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
# table = dynamodbResource.Table('stats2020')
# squads_table = dynamodbResource.Table('players2020')
# users_table = dynamodbResource.Table('users2020')
# lineups_table = dynamodbResource.Table('lineups2020')
# rounds_table = dynamodbResource.Table('rounds2020')
table = dynamodbResource.Table('XRL2020')

forwards = ['Prop', '2nd Row', 'Lock', 'Interchange']
playmakers = ['Five-Eighth', 'Halfback', 'Hooker']
backs = ['Winger', 'Centre', 'Fullback']

# resp = squads_table.scan()
squads = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM')
)['Items']

stat_columns_final = []

number = sys.argv[1]

def involvement_try(player, position):
    #=IF(AND(D2="Back",AB2>34),1,IF(AND(D2="Playmaker",AB2>44),1,IF(AND(D2="Forward",AB2>49),1,0)))
    relevant_stats = ["Tries", "Field Goals", "All Runs", "Line Breaks", "Line Break Assists", "Try Assists", "Tackle Breaks",
        "Offloads", "Tackles Made", "Kicks", "40/20", "20/40"]
    stats = sum([int(player[stat]) for stat in player.keys() if stat in relevant_stats])
    if position == 'Back' and stats > 34:
        return True
    elif position == 'Playmaker' and stats > 44:
        return True
    elif position == 'Forward' and stats > 49:
        return True
    return False 

def positional_try(player, position):
    #=IF(S2>7,1,IF(D2="Back",IF(L2>16,1,0),IF(T2>39,1,IF(D2="Playmaker",IF(W2>249,1,0),IF(D2="Forward",IF(M2>139,1,0),0)))))
    tries = 0
    relevant_stats = ["Line Breaks", "Line Break Assists", "Try Assists", "Tackle Breaks",
        "Offloads", "40/20", "20/40", "One on One Steal"]
    creative = sum([int(player[stat]) for stat in player.keys() if stat in relevant_stats])
    if creative > 7:
        tries += 1
    if position == 'Back':
        if int(player["All Runs"]) > 16:
            tries += 1
    if position == 'Playmaker':
        if int(player["Tackles Made"]) > 39:
            tries += 1
        if int(player["Kicking Metres"]) > 249:
            tries += 1
    if position == 'Forward':
        if int(player["Tackles Made"]) > 39:
            tries += 1
        if int(player["All Run Metres"]) > 139:
            tries += 1
    return tries

def missing(player, position):
    #=IF(AND(F2>49,G2<2),IF(AND(D2="Back",AB2<15),1,IF(AND(D2="Playmaker",AB2<20),1,IF(AND(D2="Forward",AB2<25),1,0))),0)
    relevant_stats = ["Tries", "Field Goals", "All Runs", "Line Breaks", "Line Break Assists", "Try Assists", "Tackle Breaks",
        "Offloads", "Tackles Made", "Kicks", "40/20", "20/40"]
    stats = sum([int(player[stat]) for stat in player.keys() if stat in relevant_stats])
    if int(player["Mins Played"]) > 49 and int(player["Tries"]) < 2:
        if position == 'Back' and stats < 15:
            return True
        if position == 'Playmaker' and stats < 20:
            return True
        if position == 'Forward' and stats < 25:
            return True
    return False

def get_stats():

    with open(f'../stats/2020/round-1.csv', 'r') as csvFile:

        reader = csv.DictReader(csvFile)

        player_stats_final = list(reader)
        
        

    print("Stat scraping complete. Calculating player scores...")
    
    players_team = player_stats_final[0]['Team']
    opponent = player_stats_final[18]['Team']
    count = 1
    for player in player_stats_final:
        for col in player.keys():
            try:
                player[col] = int(player[col])
            except ValueError:
                continue

        if player['Position'] == '2nd':
            player['Position'] = '2nd Row'
        if player['Team'] != players_team:
            count += 1
            if count % 2 == 0:
                opponent = players_team
            else:
                opponent = player_stats_final[18 * count]['Team']
            players_team = player['Team']
        player['Opponent'] = opponent

        squad_entry = [p for p in squads if p['player_name'].lower() == player['Player'].lower() and p['nrl_club'] == player['Team']]
        if len(squad_entry) == 0:
            squad_entry = [p for p in squads if p['player_name'].lower() == player['Player'].lower()]
            if len(squad_entry) != 1:
                if len(squad_entry) == 0:
                    print(f"Couldn't find {player['Player']} in database. Adding now. Remember to check position later.")
                elif len(squad_entry) > 1:
                    print(f"""A player named {player['Player']} has moved to the {player['Team']}. There is more than one
                    {player['Player']} in the database. Creating a new player entry for now. Remember to update the player's
                    team manually and update stats again.""")
                if player['Position'] in forwards: new_player_position = 'Forward'
                if player['Position'] in playmakers: new_player_position = 'Playmaker'
                if player['Position'] in backs: new_player_position = 'Back'
                player_id = str(max([int(p['player_id']) for p in squads]) + 1)
                table.put_item(
                    Item={
                        'pk': 'PLAYER#' + player_id,
                        'sk': 'PROFILE',
                        'data': 'TEAM#None',
                        'player_id': player_id,
                        'player_name': player['Player'],
                        'nrl_club': player['Team'],
                        'xrl_team': 'None',
                        'search_name': player['Player'].lower(),
                        'position': new_player_position,
                        'position2': None,
                        'stats': {},
                        'scoring_stats': {},
                        'times_as_captain': 0
                    }                    
                )
                squad_entry = {}
                squad_entry['position'] = new_player_position
                squad_entry['position2'] = ''
            else:
                squad_entry = squad_entry[0]
                player_id = squad_entry['player_id']
                print(f"{player['Player']} has moved to the {player['Team']}. Updating his team in the database.")
                table.update_item(
                    Key={
                        'pk': squad_entry['pk'],
                        'sk': 'PROFILE'
                    },
                    UpdateExpression="set nrl_club=:c",
                    ExpressionAttributeValues={
                        ':c': player['Team']
                    }
                )
                table.update_item(
                    Key={
                        'pk': squad_entry['pk'],
                        'sk': 'LINEUP#' + str(number)
                    },
                    UpdateExpression="set nrl_club=:c",
                    ExpressionAttributeValues={
                        ':c': player['Team']
                    }
                )
        else: 
            squad_entry = squad_entry[0]
            player_id = squad_entry['player_id']

        player['player_id'] = player_id
        player_scores = {}
        player_scores[squad_entry['position']] = {
            'tries': player['Tries'],
            'sin_bins': player['Sin Bins'],
            'send_offs': player['Send Offs'],
            'involvement_try': involvement_try(player, squad_entry['position']),
            'positional_try': positional_try(player, squad_entry['position']) > 0,
            'mia': missing(player, squad_entry['position']),
            'concede': False if positional_try(player, squad_entry['position']) > 1 else int(player['Missed Tackles']) > 4 or int(player['Errors']) > 2
        }
        if 'position2' in squad_entry.keys() and squad_entry['position2'] != '' and squad_entry['position2'] != None:
            player_scores[squad_entry['position2']] = {
            'tries': player['Tries'],
            'sin_bins': player['Sin Bins'],
            'send_offs': player['Send Offs'],
            'involvement_try': involvement_try(player, squad_entry['position2']),
            'positional_try': positional_try(player, squad_entry['position2']) > 0,
            'mia': missing(player, squad_entry['position2']),
            'concede': False if positional_try(player, squad_entry['position2']) > 1 else int(player['Missed Tackles']) > 4 or int(player['Errors']) > 2
            }
        player_scores['kicker'] = {
            'goals': player['Conversions'] + player['Penalty Goals'],
            'field_goals': player['Field Goals']
        }
        player['Scoring Stats'] = player_scores


    print("Loading to dynamodb, table: stats2020")
    print("round_number: " + number)
    # print("First Player: " + str(player_stats_final[0][0]))
    # print("First stat map: " + str(player_stats_final[0][1]))
    # print("First score map: " + str(player_stats_final[0][2]))
    
    for player in player_stats_final:
        table.put_item(Item={
            "pk": 'PLAYER#' + player['player_id'],
            "sk": 'STATS#' + str(number),
            'data': 'CLUB#' + player['Team'],
            "player_id": player['player_id'],
            "round_number": number,
            "player_name": player['Player'],
            "nrl_club": player['Team'],
            "opponent": player['Opponent'],
            "stats": player,
            "scoring_stats": player['Scoring Stats']
        })            

    print("Stats update complete, scoring lineups")
    # users = users_table.scan()['Items']
    # xrl_teams = [user['team_short'] for user in users]
    fixtures = table.query(
        KeyConditionExpression=Key('pk').eq('ROUND#' + str(number)) & Key('sk').begins_with('FIXTURE')
    )['Items']
    round_lineups = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('LINEUP#' + str(number)) & Key('data').begins_with('TEAM#')
    )['Items']
    # print("First lineup entry: " + str(round_lineups[0]))
    for match in fixtures:
        print(f"Match: {match['home']} v {match['away']}")
        scores = {}
        for team in ['home', 'away']:
            lineup = [p for p in round_lineups if p['xrl_team'] == match[team]]
            print(f"{match[team]} fielded {len(lineup)} players")
            # print("First player: " + str(lineup[0]))
            lineup_score = 0
            for player in lineup:
                player_lineup_score = 0
                played_nrl = False
                played_xrl = False
                for player_stats in player_stats_final:
                    if player['player_id'] == player_stats['player_id']:
                        played_nrl = player_stats['Mins Played'] > 0
                        played_xrl = played_nrl and not player['position_specific'].startswith('int')
                        if player['position_general'] not in player_stats['Scoring Stats'].keys():
                            print(str(player))
                            print(str(player_stats))                       
                        player_scoring_stats = player_stats['Scoring Stats'][player['position_general']]
                        player_lineup_score += player_scoring_stats['tries'] * 4
                        player_lineup_score -= player_scoring_stats['sin_bins'] * 2
                        if player_scoring_stats['send_offs'] != 0:
                            minutes = 80 - player_scoring_stats['send_offs']
                            deduction = math.floor(minutes / 10) + 4
                            player_lineup_score -= deduction
                        if player_scoring_stats['involvement_try']: player_lineup_score += 4
                        if player_scoring_stats['positional_try'] > 0: player_lineup_score += 4
                        if player_scoring_stats['mia']: player_lineup_score -= 4
                        if player_scoring_stats['concede']: player_lineup_score -= 4
                        if player['kicker']:
                            player_kicking_stats = player_stats['Scoring Stats']['kicker']
                            player_lineup_score += player_kicking_stats['goals'] * 2
                            player_lineup_score += player_kicking_stats['field_goals']
                        if player['captain'] or player['captain2']:
                            player_lineup_score *= 2
                # if not played_nrl:
                #     print(f"{player['player_name']} didn't play NRL this week")
                table.update_item(
                    Key={
                        'pk': player['pk'],
                        'sk': player['sk']
                    },
                    UpdateExpression="set played_nrl=:p, played_xrl=:x, score=:s",
                    ExpressionAttributeValues={
                        ':p': played_nrl,
                        ':x': played_xrl,
                        ':s': player_lineup_score
                    }
                )
                if played_xrl:
                    lineup_score += player_lineup_score
            scores[team] = lineup_score
        match['home_score'] = scores['home']
        match['away_score'] = scores['away']
        table.update_item(
            Key={
                'pk': match['pk'],
                'sk': match['sk']
            },
            UpdateExpression='set home_score=:hs, away_score=:as',
            ExpressionAttributeValues={
                ':hs': match['home_score'],
                ':as': match['away_score']
            }
        )
    # rounds_table.update_item(
    #     Key={
    #         'round_number': int(number)
    #     },
    #     UpdateExpression="set fixtures=:f",
    #     ExpressionAttributeValues={
    #         ':f': fixtures
    #     }
    # )
    print('Lineup scoring complete')
    finish = datetime.now()
    print(f"Execution took {finish - start}")       
            

if __name__ == '__main__':
    get_stats()