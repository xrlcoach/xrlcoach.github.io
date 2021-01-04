import boto3
import random
import sys
from datetime import datetime

log = open('logs/generate_fixtures.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
roundsTable = dynamodbResource.Table('rounds2020')
usersTable = dynamodbResource.Table('users2020')

print("Scanning users table...")
users = usersTable.scan()['Items']
print(f"First record: {users[0]}")
round_number = 0

while round_number < 21:
        xrl_users = [team['team_short'] for team in users]
        print(f"Teams: {xrl_users}")
        fixtures = []
        print("Generating fixtures...")
        for i in range(len(xrl_users)-1):

                mid = int(len(xrl_users) / 2)
                l1 = xrl_users[:mid]
                l2 = xrl_users[mid:]
                l2.reverse()    

                # Switch sides after each round
                if(i % 2 == 1):
                        fixtures = fixtures + [ zip(l1, l2) ]
                else:
                        fixtures = fixtures + [ zip(l2, l1) ]

                xrl_users.insert(1, xrl_users.pop())
        print("Saving to database...")
        for r in fixtures:
                round_number += 1
                round_matches = []
                for match in r:
                        round_matches.append({'home': match[0], 'away': match[1]})                
                roundsTable.put_item(
                        Item={
                                'round_number': round_number,
                                'active': False,
                                'in_progress': False,
                                'completed': False,
                                'fixtures': round_matches
                        }
                )

        if round_number == 21:
                break
        print("Generating reverse fixtures...")
        xrl_users = [team['team_short'] for team in users]
        fixtures = []
        for i in range(len(xrl_users)-1):

                mid = int(len(xrl_users) / 2)
                l1 = xrl_users[:mid]
                l2 = xrl_users[mid:]
                l2.reverse()    

                # Switch sides after each round
                if(i % 2 == 1):
                        fixtures = fixtures + [ zip(l1, l2) ]
                else:
                        fixtures = fixtures + [ zip(l2, l1) ]

                xrl_users.insert(1, xrl_users.pop())
        print("Saving to database...")
        for r in fixtures:
                round_number += 1
                round_matches = []
                for match in r:
                        round_matches.append({'home': match[1], 'away': match[0]})                
                roundsTable.put_item(
                        Item={
                                'round_number': round_number,
                                'active': False,
                                'in_progress': False,
                                'completed': False,
                                'fixtures': round_matches
                        }
                )
print("Draw complete")
