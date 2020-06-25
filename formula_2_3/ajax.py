from django.core.exceptions import ObjectDoesNotExist
from datetime import datetime, timedelta, date
from django.utils import timezone
from django.db.models import Q
from django.forms.models import model_to_dict

from user.models import User, Player, Session, Team
from . import models



FLAG_FEED_DATA = True
FLAG_FEED_STAT = True



class Formula23Ajax():
    # Create your views here.

    # constructure
    def __init__(self):
        self.game_id = 0
        self.championship = 0


    # set game_id & championship
    def set_gameId_championship(self, game_id):
        self.game_id = game_id
        try:
            print("game id championship", self.game_id, Session.objects.get(id=self.game_id))
            self.session = Session.objects.get(id=self.game_id)
            self.championship = self.session.championship
            self.teams = Team.objects.filter(championship=self.championship)
            self.players = Player.objects.filter(is_enable=1, team__in=self.teams).order_by('number')
        except ObjectDoesNotExist as e:
            print("set_gameId_championship", e, self.game_id)
            pass


    # get empty socre
    def get_empty_score(self, flag_key=False):
        empty_score = {
            'positionValue' : 0,
			'laps' : 0,
			'gap' : '',
			'interval' : '',
			'bestLap' : 0,
			'bestValue' : '',
			'sector1' : '',
			'sector2' : '',
			'sector3' : '',
			'lastValue' : '',
			'pits' : 0,
			'statusRetired' : 0,
			'statusInPit' : 0,
			'statusPitOut' : 0,
			'statusStopped' : 0,
			'created_at' : ''
        }
        if flag_key == True:
            return list(empty_score.keys())
        else :
            return empty_score


    # get current scores from scores table
    def get_current_scores(self):
        scores = {}
        exists = {}
        
        for player in self.players:
            scores[player.number] = {}
            exists[player.number] = {}

        history_scores = models.Score.objects.filter(game=self.session).order_by('-created_at')
        count_known = 0
        for h_score in history_scores:
            number = h_score.RacingNumber
            lap = h_score.laps
            exists[number][lap] = h_score.id # current score id array from score table
            if scores[number] : continue
            else :
                scores[number] = get_customize(model_to_dict(h_score), self.get_empty_score())
                count_known += 1
            if count_known >= len(scores) : break
        
        for s in scores:
            if not s :
                s = self.get_empty_score()
        
        # print(scores)
        return {'scores' : scores, 'exists' : exists}


    # calculate socres from datas feed
    def calc_socres(self):
        if not self.game_id > 0 or not self.session : return False

        # get session by game id
        result = self.get_current_scores()
        scores = result['scores']
        exists = result['exists']
        if FLAG_FEED_DATA : # from datas table
            data_from_datas = models.Data.objects.filter(game=self.session, is_process=1).order_by('created_at')
            data_from_datas.update(is_process=1)

        # calculate...
        keys = self.get_empty_score(True)
        table_keys = keys
        table_keys.append('game_id')
        table_keys.append('RacingNumber')
        result_database = {}
        data_from_datas = data_from_datas.values()
        if data_from_datas and scores :
            for data in data_from_datas :
                # number = data.RacingNumber
                number = data['RacingNumber']
                if not scores[number] :
                    scores[number] = self.get_empty_score()
                # lap = data.laps if data.laps != "" else -1
                lap = data['laps'] if data['laps'] != "" else -1
                temp = scores[number]

                if int(temp['laps']) < int(lap) :
                    temp['laps'] = int(lap)

                data['sector1'] = ''
                data['sector2'] = ''
                data['sector3'] = ''
                if data['Id0'] > 0 : data['sector'+str(data['Id0'])] = data['Value0']
                if data['Id1'] > 0 : data['sector'+str(data['Id1'])] = data['Value1']
                if data['Id2'] > 0 : data['sector'+str(data['Id2'])] = data['Value2']

                for key in keys:
                    if data[key] == "" or data[key] == "." or data[key] == 0 : continue
                    if key != 'game_id' and data[key] != temp[key] :
                        temp[key] = data[key]
                
                scores[number] = temp
                if not number in result_database :
                    result_database[number] = {}
                result_database[number][temp['laps']] = temp

            for number in result_database :
                res1 = result_database[number]
                for lap in res1:
                    res = res1[lap]
                    table_vals = res.values()
                    table_vals.append(game_id)
                    table_vals.append(number)
                    if exists[number][lap] and exists[number][lap] > 0:
                        update_row(models.Score, table_keys, table_vals, {'id':exists[number][lap]})
                    else :
                        insert_row(models.Score, table_keys, table_vals)


    # get id array from feeds
    def getIdsFromFeed(self, old_ids, feeds, feed_name, flag_sorted=True) :
        ids = old_ids
        if not flag_sorted :
            # sorting...
            pass
        
        for f in feeds:
            if f.created_at and f.created_at != "" :
                # time = f.created_at.strftime("%H:%M:%S")
                time = f.created_at[11:19]
                try:
                    ids[time][feed_name].append(f.id)
                except KeyError:
                    ids[time] = {feed_name : []}
        
        return ids


    # get timeline json
    def getTimeline(self) :
        if not self.game_id > 0 : return False

        time_result = {}

        if FLAG_FEED_DATA : # from datas table
            data_from_datas = models.Data.objects.filter(game=self.session).order_by('created_at')
            time_result = self.getIdsFromFeed(time_result, data_from_datas, 'data')
        
        if FLAG_FEED_STAT : # from stats table
            data_from_stats = models.Stat.objects.filter(game=self.session).order_by('created_at')
            time_result = self.getIdsFromFeed(time_result, data_from_stats, 'stat')
        
        return time_result

    
    # make datafeed via datas table row
    def make_datafeed(self, row):
        result = {}

        if row['Number'] and row['Number'] != "" : result['Number'] = row['Number']
        if row['bestValue'] and row['bestValue'] != "":
            result['best'] = {
                'Lap' : row['bestLap'] if row['bestLap'] else '',
                'Value' : row['bestValue']
            }
        if row['RacingNumber'] and row['RacingNumber'] != "":
            result['driver'] = {
                'RacingNumber' : row['RacingNumber'],
                'FullName' : row['FullName'] if row['FullName'] else '',
                'BroadcastName' : row['BroadcastName'] if row['BroadcastName'] else '',
                'TLA' : row['TLA'] if row['TLA'] else ''
            }
        if row['gap'] and row['gap'] != "" : result['gap'] = {'Value' : row['gap']}
        if row['interval'] and row['interval'] != "" : result['interval'] = {'Value' : row['interval']}
        if row['laps'] and row['laps'] != "" : result['laps'] = {'Value' : row['laps']}
        if row['lastValue'] and row['lastValue'] != "":
            result['last'] = {
                'OverallFastest' : row['lastOverallFastest'] if row['lastOverallFastest'] else 0,
                'PersonalFastest' : row['lastPersonalFastest'] if row['lastPersonalFastest'] else 0,
                'Value' : row['lastValue']
            }
        if row['pits'] and row['pits'] != "" : result['pits'] = {'Value' : row['pits']}
        if row['positionValue'] and row['positionValue'] > 0:
            result['position'] = {
                'Show' : row['positionShow'] if row['positionShow'] else 0,
                'Value' : row['positionValue']
            }
        if row['Value0'] and row['Value0'] != "":
            result['sectors'] = {
                0 : {
                    'OverallFastest' : row['OverallFastest0'] if row['OverallFastest0'] else 0,
                    'PersonalFastest' : row['PersonalFastest0'] if row['PersonalFastest0'] else 0,
                    'Stopped' : row['Stopped0'] if row['Stopped0'] else 0,
                    'Id' : row['Id0'] if row['Id0'] else '',
                    'Value' : row['Value0']
                }
            }
        if row['Value1'] and row['Value1'] != "":
            result['sectors'][1] = {
                'OverallFastest' : row['OverallFastest1'] if row['OverallFastest1'] else 0,
                'PersonalFastest' : row['PersonalFastest1'] if row['PersonalFastest1'] else 0,
                'Stopped' : row['Stopped1'] if row['Stopped1'] else 0,
                'Id' : row['Id1'] if row['Id1'] else '',
                'Value' : row['Value1']
            }
        if row['Value2'] and row['Value2'] != "":
            result['sectors'][2] = {
                'OverallFastest' : row['OverallFastest2'] if row['OverallFastest2'] else 0,
                'PersonalFastest' : row['PersonalFastest2'] if row['PersonalFastest2'] else 0,
                'Stopped' : row['Stopped2'] if row['Stopped2'] else 0,
                'Id' : row['Id2'] if row['Id2'] else '',
                'Value' : row['Value2']
            }
        if row['statusStopped'] :
            result['status'] = {
                'Retired' : row['statusRetired'] if row['statusRetired'] else 0,
                'InPit' : row['statusInPit'] if row['statusInPit'] else 0,
                'PitOut' : row['statusPitOut'] if row['statusPitOut'] else 0,
                'Stopped' : row['statusStopped'],
                'ts' : row['statusts'] if row['statusts'] else ''
            }

        return {
            'data' : {
                0 : row['created_at'] if row['created_at'] else '',
                1 : {
                    'DataWithheld' : 0,
                    'Series' : '',
                    'Session' : '',
                    'lines' : []
                },
                2 : [
                    result
                ]
            }
        }


    # make stats feed via stats table row
    def make_statfeed(self, row):
        result = {}

        if row['Number'] and row['Number'] != "" : result['Number'] = row['Number']
        if row['RacingNumber'] and row['RacingNumber'] != "":
            result['driver'] = {
                'RacingNumber' : row['RacingNumber']
            }
        if row['PersonalBestLapValue'] and row['PersonalBestLapValue'] != "":
            result['PersonalBestLapTime'] = {
                'Lap' : row['PersonalBestLap'] if row['PersonalBestLap'] else 0,
                'Position' : row['PersonalBestLapPosition'] if row['PersonalBestLapPosition'] else 0,
                'Value' : row['PersonalBestLapValue']
            }
        if row['BestSectorsValue0'] and row['BestSectorsValue0'] != "":
            result['BestSectors'] = {
                0 : {
                    'Position' : row['BestSectorsPosition0'] if row['BestSectorsPosition0'] else 0,
                    'Id' : row['BestSectorsId0'] if row['BestSectorsId0'] else 0,
                    'Value' : row['BestSectorsValue0']
                }
            }
        if row['BestSectorsValue1'] and row['BestSectorsValue1'] != "":
            result['BestSectors'][1] = {
                'Position' : row['BestSectorsPosition1'] if row['BestSectorsPosition1'] else 0,
                'Id' : row['BestSectorsId1'] if row['BestSectorsId1'] else 0,
                'Value' : row['BestSectorsValue1']
            }
        if row['BestSectorsValue2'] and row['BestSectorsValue2'] != "":
            result['BestSectors'][2] = {
                'Position' : row['BestSectorsPosition2'] if row['BestSectorsPosition2'] else 0,
                'Id' : row['BestSectorsId2'] if row['BestSectorsId2'] else 0,
                'Value' : row['BestSectorsValue2']
            }
        if row['BestSpeedsValue0'] and row['BestSpeedsValue0'] != "":
            result['BestSpeeds'] = {
                0 : {
                    'Position' : row['BestSpeedsPosition0'] if row['BestSpeedsPosition0'] else 0,
                    'Id' : row['BestSpeedsId0'] if row['BestSpeedsId0'] else 0,
                    'Value' : row['BestSpeedsValue0']
                }
            }
        if row['BestSpeedsValue1'] and row['BestSpeedsValue1'] != "":
            result['BestSpeeds'][1] = {
                'Position' : row['BestSpeedsPosition1'] if row['BestSpeedsPosition1'] else 0,
                'Id' : row['BestSpeedsId1'] if row['BestSpeedsId1'] else 0,
                'Value' : row['BestSpeedsValue1']
            }
        if row['BestSpeedsValue2'] and row['BestSpeedsValue2'] != "":
            result['BestSpeeds'][2] = {
                'Position' : row['BestSpeedsPosition2'] if row['BestSpeedsPosition2'] else 0,
                'Id' : row['BestSpeedsId2'] if row['BestSpeedsId2'] else 0,
                'Value' : row['BestSpeedsValue2']
            }
        if row['BestSpeedsValue3'] and row['BestSpeedsValue3'] != "":
            result['BestSpeeds'][3] = {
                'Position' : row['BestSpeedsPosition3'] if row['BestSpeedsPosition3'] else 0,
                'Id' : row['BestSpeedsId3'] if row['BestSpeedsId3'] else 0,
                'Value' : row['BestSpeedsValue3']
            }

        return {
            'statsfeed' : {
                0 : row['created_at'] if row['created_at'] else '',
                1 : [
                    result
                ]
            }
        }


    # get current datas feeds via current time datas feed ids
    def get_current_time_data(self, datas, flag):
        result = models.Data.objects.filter(id__in=datas).order_by('created_at', 'id')
        r_ids = set(r.id for r in result)
        result = filter(lambda x: x.id not in r_ids, result)
        print("current game", result)
        # return result
        
        if flag and result : # reload
            self.set_gameId_championship(result[0].game_id)
            if self.session :
                known_count = len(self.players)
                known_players = {}
                temp = {}
                result_temp = {}
                
                if known_count > 0:
                    # all players
                    for player in self.players:
                        known_players[player.number] = False
                        result_temp[player.number] = {'RacingNumber' : player.number}
                    
                    temp = models.Data.objects.filter(game=self.session, created_at__gte=result[0]['created_at']).order_by('-created_at')
                    for t in temp:
                        if known_count <= 0 : break
                        no = t.RacingNumber

                        if not known_players[no] and result_temp[no]['positionValue'] and result_temp[no]['laps']:
                            known_players[no] = True
                            known_count -= 1
                            
                        if not result_temp[no]['positionValue'] and t.positionValue > 0:
                            result_temp[no]['positionShow'] = t.positionShow
                            result_temp[no]['positionValue'] = t.positionValue
                        
                        if not result_temp[no]['gap'] and (t.gap != "" or t.gap != ".") : result_temp[no]['gap'] = t.gap
                        if not result_temp[no]['interval'] and (t.interval != "" or t.interval != ".") : result_temp[no]['interval'] = t.interval
                        if not result_temp[no]['laps'] and (t.laps != "" and t.laps != ".") : result_temp[no]['laps'] = t.laps
                        if not result_temp[no]['pits'] and (t.pits != "" and t.pits != ".") : result_temp[no]['pits'] = t.pits
                        if not result_temp[no]['lastValue'] and t.lastValue != "":
                            result_temp[no]['lastValue'] = t.lastValue
                            result_temp[no]['lastOverallFastest'] = t.lastOverallFastest
                            result_temp[no]['lastPersonalFastest'] = t.lastPersonalFastest
                        
                        if not result_temp[no]['bestValue'] and t.bestValue != "":
                            result_temp[no]['bestLap'] = t.bestLap
                            result_temp[no]['bestValue'] = t.bestValue
                        if not result_temp[no]['Value'+t.Id0] and (t.Value0 != "" and t.Value0 != "."):
                            result_temp[no]['Value'+t.Id0] = t.Value0
                            result_temp[no]['Id'+t.Id0] = t.Id0
                            result_temp[no]['OverallFastest'+t.Id0] = t.OverallFastest0
                            result_temp[no]['PersonalFastest'+t.Id0] = t.PersonalFastest0
                            result_temp[no]['Stopped'+t.Id0] = t.Stopped0
                        
                        result_temp[no]['created_at'] = t.created_at

                    result.append(result_temp)

        temp = []
        if len(result) > 0 :
            for row in result:
                if not row['created_at'] : continue
                temp.append(self.make_datafeed(row))
        
        return temp


    # get current stats feeds via current time stats feed ids
    def get_current_time_stat(self, stats, flag):
        result = models.Stat.objects.filter(id__in=stats).order_by('created_at', 'id')
        r_ids = set(r.id for r in result)
        result = filter(lambda x: x.id not in r_ids, result)
        
        if flag and len(result) > 0 : # reload
            pass

        temp = []
        if len(result) > 0 :
            for row in result:
                if not row['created_at'] : continue
                temp.append(self.make_statfeed(row))
        
        return temp


    # get analysis data
    def get_analysis(self):
        result = models.Score.objects.filter(game=self.session).order_by('created_at', 'id')

        temp = []
        for row in result:
            t = get_customize(model_to_dict(row), {})
            if row.created_at and row.created_at != "" :
                t['created_at'] = row.created_at[11:19]
            temp.append(t)
        
        return {
            'data' : temp,
            'game' : get_customize(model_to_dict(self.session), flag_convert_datetime=True)
        }



# get array default|custom
def get_customize(custom_array, default_array={}, flag_convert_datetime=False):
    merged = default_array

    if isinstance(custom_array, dict) and custom_array:
        for key in custom_array :
            value = custom_array[key]
            if flag_convert_datetime and isinstance(value, (date, datetime)):
                value = value.isoformat()
            if isinstance(value, dict) and merged[key] != None and isinstance(merged[key], dict) :
                merged[key] = get_customize(value, merged[key])
            elif value != None :
                merged[key] = value

    return merged


# update row in table
def update_row(model_name, keys, values, filter_arguments):
    objs = model_name.objects.filter(**filter_arguments)
    update_query = dict(zip(keys, values))
    objs.update(**update_query)


# insert row into table
def insert_row(model_name, keys, values):
    obj = model_name(**dict(zip(keys, values)))
    obj.save()