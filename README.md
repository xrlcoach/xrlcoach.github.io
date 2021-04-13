# ![XRL Logo](https://res.cloudinary.com/dkj7bctqg/image/upload/c_scale,w_55/v1618314592/Projects/XRL/xrl-logo_tzx4xk.png) XRL - Fantasy Rugby League
### A web app in which users pick players, set weekly lineups, and get scored based on the performance of their players in that week's NRL fixtures.  

### Note: The competition run at this domain is private, but the code is there for anyone interested in setting up their own game!

## Overview

### Back End  
#### AWS
* Single-table DynamoDb database
* Cognito User Pool
* Lambda functions (Python)
* API Gateway

#### Other
* Python scripts controlling stat scraping and game state currently being run as cron jobs from a Raspberry Pi 4

### Front End
HTML and Vanilla JavaScript hosted in this repo, published via GitHub Pages

## Breakdown
### Team Selection
Database contains player profiles for all NRL players. Each NRL player can only belong to a single XRL team. Initial player draft is conducted externally, and teams are able to pick all their players in-game at the start of the season. After that, roster changes are limited to the waiver and scooping systems, and trades between XRL teams.
### Season Structure
Over the course of the NRL season, the fantasy XRL teams go head-to-head in a round robin. The top teams go into a finals series which takes place over the final 4 weeks of the regular NRL season.

![XRL Ladder](https://res.cloudinary.com/dkj7bctqg/image/upload/c_scale,w_824/v1618314905/Projects/XRL/xrl-league-table_utc2if.gif)


### Round Structure
#### Matchday
Every week, each user must set their lineup before the first NRL match of the round. A full lineup consists of 13 starters and 4 interchange players. Players can only be selected in their general position (Back, Playmaker or Forward). User's also nominate a team captain and kicker.

![XRL Match](https://res.cloudinary.com/dkj7bctqg/image/upload/c_scale,w_824/v1618314907/Projects/XRL/xrl-match-centre_ej3ogh.gif)


A web scraping function runs throughout the weekend, retrieving each player's real-world stats and giving them an XRL score based on their performance (as per XRL scoring rules). After the last match of the round, substitutions are factored in for any players who didn't play that week, and then XRL team scores are re-calculated and results finalised.

![XRL Player Stats](https://res.cloudinary.com/dkj7bctqg/image/upload/c_scale,w_824/v1618314910/Projects/XRL/xrl-stats_ctgtib.gif)


#### Transfers
##### Waivers
From the start of the round (usually Thursday evening) up until Tuesday 12pm, users can add any unclaimed NRL players (free agents) to their preference list for the next round of player waivers. A function runs each Tuesday which allocates free agents to XRL teams in order of 'waiver rank'. This rank is then re-calculated based on which teams picked up players. Users can then make new preferences for a second round on Wednesdays.
##### Scooping
On a Thursday morning, any free agents who are not signed during waivers are made available to be scooped by anyone. Users can scoop as many players as they like, but users who scoop more players will move below others in the waiver order. The scooping period ends when the round starts.
##### Trades
Users can offer player trades to other XRL users at any time.
