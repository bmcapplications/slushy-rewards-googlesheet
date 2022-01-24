# slushy-rewards-googlesheet
Pulls BTC rewards from Slush Pool's API and stores them in Google Sheets

![Slushy Screenshot](https://user-images.githubusercontent.com/8978271/150710591-f077d60c-7182-4d98-a2f0-e060a9d32277.png)

Setup Steps
1. Log into your Slush Pool account and create a "Limited read-only" API token
2. Go to https://docs.google.com/spreadsheets/d/1Tq8IWa01LJK_ErTwDrEAPDTutyRAhIZ5XY2ORTbLRhw/edit?usp=sharing
3. Select File > Make a Copy and then rename it
4. Copy the your Slush API token and paste it into the B1 cell in the Control Panel tab
5. In the spreadsheet menu select Extensions > Apps Script
6. Replace the code in the Apps Script editor with the content of https://github.com/bmcapplications/slushy-rewards-googlesheet/blob/main/Code.gs
7. Review the inserted code in Apps Script and then press the Save Project icon. Rename the untitled project if you like. You can now close this window
8. Return to Spreadsheet and refresh the page
9. A few moments after the spreadsheet refreshes you should see a new menu at the top called Control Board. Select Control Board > Refresh Slush Data
10. In the authorization prompt, select Continue. Then select your Google account, then select Advanced
11. In the Google hasn't verified this app screen, select Advanced. then at the bottom select "Go to <app script project name> (unsafe)"
12. In the next screen, review permissions and then select Allow
13. After the permissions are accepted, once again select Control Board > Refresh Slush Data. You should now see the last 15 blocks get inserted into the Rewards tab
