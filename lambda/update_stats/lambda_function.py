import time
import datetime
import boto3
import os
import stat
from decimal import Decimal
from botocore.errorfactory import ClientError
from selenium import webdriver

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodbResource.Table('stats2020')

stat_columns_final = []

def driver_setup():

    """Set up selenium driver and headless browser to interact with website"""
    
    #chrome_driver_path = '/usr/bin/chromedriver'
    
    
    #os.chmod('/opt/chromedriver', st.st_mode | stat.S_IEXEC)

    options = Options()
    options.headless = True
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--single-process')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--log-level=3')
    options.binary_location = "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"

    return webdriver.Chrome(
        executable_path='./chromedriver.exe', options=options
    )
    
options = Options()
#options.headless = True
#options.binary_location = '/opt/headless-chromium'
#options.add_argument('--headless')
#options.add_argument('--no-sandbox')
#options.add_argument('--single-process')
#options.add_argument('--disable-dev-shm-usage')

def involvement_try(player, position):
    #=IF(AND(D2="Back",AB2>34),1,IF(AND(D2="Playmaker",AB2>44),1,IF(AND(D2="Forward",AB2>49),1,0)))
    stats = sum(player[1:12])
    if position == 'Back' and stats > 34:
        return True
    elif position == 'Playmaker' and stats > 44:
        return True
    elif position == 'Forward' and stats > 49:
        return True
    return False 

def playmaker_try(player, position):
    #=IF(S2>7,1,IF(D2="Back",IF(L2>16,1,0),IF(T2>39,1,IF(D2="Playmaker",IF(W2>249,1,0),IF(D2="Forward",IF(M2>139,1,0),0)))))
    creative = sum(player[4:9], player[11])
    if creative > 7:
        return True
    if position == 'Back':
        if player[14] > 16:
            return True
    if position == 'Playmaker':
        if player[9] > 39:
            return True
        if player[15] > 249:
            return True
    if position == 'Forward':
        if player[9] > 39:
            return True
        if player[16] > 139:
            return True
    return False

def missing(player, position):
    #=IF(AND(F2>49,G2<2),IF(AND(D2="Back",AB2<15),1,IF(AND(D2="Playmaker",AB2<20),1,IF(AND(D2="Forward",AB2<25),1,0))),0)
    stats = sum(player[1:12])
    if player[17] > 49 and player[1] < 2:
        if position == 'Back' and stats < 15:
            return True
        if position == 'Playmaker' and stats < 20:
            return True
        if position == 'Forward' and stats < 25:
            return True
    return False

def get_stats():

    with driver_setup() as driver:
        
        url = 'https://www.nrl.com/draw/nrl-premiership/2020/'
        url1 = 'https://www.nrl.com/draw/?competition=111&season=2020&round=1'

        # Set timeout time
        wait = WebDriverWait(driver, 10)
        # retrive URL in headless browser
        print("Connecting to http://www.nrl.com/draw")
        driver.get(url1)

        # round_number = driver.find_element_by_class_name(
        # "filter-round__button filter-round__button--dropdown"
        # ).text
        round_number = driver.find_element_by_css_selector(
            "button[class='filter-round__button filter-round__button--dropdown']"
            ).text
        round_number = round_number.split()
        print(round_number)
        number = round_number[1]
        round_number = "-".join(round_number)

        player_stats_final = []

        # Scrape match titles located in hidden html fields
        draw_list = driver.find_elements_by_class_name("u-visually-hidden")
        matches = []
        for match in draw_list:
            if match.text[:6] == 'Match:':
                # Format match title into url
                fixture = match.text[7:].split(' vs ')
                fixture_formatted = []
                for team in fixture:
                    words = team.split()
                    team_name = "-".join(words)
                    fixture_formatted.append(team_name)
                fixture_formatted = "-v-".join(fixture_formatted)
                fixture_url = url + f'{round_number}/{fixture_formatted}'
                matches.append(fixture_url)
        
        match_count = 0

        for match in matches:
            
            match_count += 1

            # Change URL into match title and team names
            title = match[match.rfind('/') + 1:]
            title = title.replace('-', ' ')
            teams = title.split(' v ')
            home_team = teams[0]
            away_team = teams[1]

            print(f'\u001b[32mGetting player stats for {title}\u001b[0m')
            # Send browser to match url
            driver.get(match)

            # find player stats
            try:
                player_stats = driver.find_element_by_link_text("Player Stats")
            except NoSuchElementException:
                print(f"\u001b[31mCouldn't get player stats for {title}\u001b[0m")
                continue
            player_stats.send_keys(Keys.RETURN)

            wait.until(presence_of_element_located((By.ID, "tabs-match-centre-3")))
            # time.sleep(3)
            
            # Find head of table with column names and parse into stat_columns list
            if match_count == 1:
                head = driver.find_element_by_tag_name("thead")
                stats_row = head.find_elements_by_tag_name("th")
    
                stat_columns = []
                for col in stats_row:
                    stat_columns.append(col.text)
    
                stat_columns = [stat for stat in stat_columns if stat != '']
                stat_columns = stat_columns[11:]
                stat_columns_final = stat_columns
                #print(stat_columns_final)
                #print(len(stat_columns_final))

            # Scrape player stats into list
            home_file = []

            home_stats = driver.find_elements_by_class_name('table-tbody__tr')  
            for player in home_stats:
                home_file.append(player.text)

            # Press button for away team
            driver.find_element_by_css_selector("button[class='button-group-item__button u-border u-t-bg-color-secondary-when-active u-t-border-color-secondary-when-active u-t-bg-color-tint-rm-on-hover u-t-border-color-tint-rm-on-hover']").click()

            away_file = []

            # Scrape player stats for away team
            away_stats = driver.find_elements_by_class_name('table-tbody__tr') 
            for player in away_stats:
                away_file.append(player.text)

            home_stats = []
            home_players = []

            # Go through list of rows and append stats (starting with digit) to stats
            # and player names to players, ignoring blank entries
            for row in home_file:
                if len(row) > 0:
                    if row[0].isdigit():
                        home_stats.append(row)
                    elif row[0].isalpha():
                        home_players.append(row)

            away_stats = []
            away_players = []  

            for row in away_file:
                if len(row) > 0:
                    if row[0].isdigit():
                        away_stats.append(row)
                    elif row[0].isalpha():
                        away_players.append(row) 

            # Create final lists for player stats, converting column info to correct type and format

            for i in range(len(home_players)):
                player = []
                player.append(home_players[i] + home_team)
                stat_map = {}
                ps = home_stats[i].split()
                if len(ps) > len(stat_columns_final):
                    ps.remove('Row')
                for j in range(len(ps)):
                    if j == 1:
                        stat_map[stat_columns_final[j]] = ps[j]
                    elif ':' in ps[j]:
                        stat_map[stat_columns_final[j]] = int(ps[j][:2])
                    elif '%' in ps[j]:
                        stat_map[stat_columns_final[j]] = Decimal(str(float(ps[j][:-1]) / 100))
                    elif '.' in ps[j]:
                        if ps[j][-1] == 's':
                            stat_map[stat_columns_final[j]] = Decimal(str(ps[j][:-1]))
                        else:
                            stat_map[stat_columns_final[j]] = Decimal(str(ps[j]))
                    elif ps[j] == '-':
                        stat_map[stat_columns_final[j]] = 0
                    elif ps[j] == '2nd':
                        stat_map[stat_columns_final[j]] = '2nd Row'
                    elif ps[j] == 'Row':
                        continue
                    else:
                        try:
                            stat_map[stat_columns_final[j]] = int(ps[j])
                        except ValueError:
                            stat_map[stat_columns_final[j]] = ps[j]
                #player.append(home_team)
                
                player.append(stat_map)
                player_stats_final.append(player)

            for i in range(len(away_players)):
                player = []
                player.append(away_players[i] + away_team)
                stat_map = {}
                ps = away_stats[i].split()
                if len(ps) > len(stat_columns_final):
                    ps.remove('Row')
                for j in range(len(ps)):
                    if j == 1:
                        stat_map[stat_columns_final[j]] = ps[j]
                    elif ':' in ps[j]:
                        stat_map[stat_columns_final[j]] = int(ps[j][:2])
                    elif '%' in ps[j]:
                        stat_map[stat_columns_final[j]] = Decimal(str(float(ps[j][:-1]) / 100))
                    elif '.' in ps[j]:
                        if ps[j][-1] == 's':
                            stat_map[stat_columns_final[j]] = Decimal(str(ps[j][:-1]))
                        else:
                            stat_map[stat_columns_final[j]] = Decimal(str(ps[j]))
                    elif ps[j] == '-':
                        stat_map[stat_columns_final[j]] = 0
                    elif ps[j] == '2nd':
                        stat_map[stat_columns_final[j]] = '2nd Row'
                    elif ps[j] == 'Row':
                        continue
                    else:
                        try:
                            stat_map[stat_columns_final[j]] = int(ps[j])
                        except ValueError:
                            stat_map[stat_columns_final[j]] = ps[j]
                #player.append(away_team)
                player.append(stat_map)
                player_stats_final.append(player)

            if match_count == 1:
                break

        # must close the driver after task finished
        driver.close()

    round_table = '_'.join(round_number.split('-'))
    round_table = round_table.lower()  
    

    print("Loading to dynamodb, table: stats2020")
    print("round_number: " + number)
    print("First Player+Club: " + player_stats_final[0][0])
    print("First stat map: " + str(player_stats_final[0][1]))


    
    with table.batch_writer() as batch:
        for player in player_stats_final:
            batch.delete_item(Key={
                "name+club": player[0],
                "round_number": number,
            })
            batch.put_item(Item={
                "name+club": player[0],
                "round_number": number,
                "stats": player[1]
            })
            

    print("Stats update complete")

if __name__ == '__main__':
    get_stats()