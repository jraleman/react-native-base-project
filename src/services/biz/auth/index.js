import format from 'string-format'
import { GA_UNKNOWN_USER, GA_FB_USER_FORMAT } from 'react-native-dotenv'
import UserRepository from '../../../storage/repositories/user'
import User from '../../../storage/models/user'
import StringUtil from '../../../utils/string-util'
import FbService from '../../facebook'
import { AccountTypes } from '../accounts'

let _userRepository = UserRepository;

let AuthService = {
    logIn: function(tracker, type, cb) {
        if(type == AccountTypes.FACEBOOK) {
            FbService.logIn((error, result) => {
                if(error) { 
                    if(tracker) {
                        tracker.setUser(GA_UNKNOWN_USER);
                    }

                    cb(error, {tracker: tracker, accessToken: null, userInfo: null});
                } else {
                    if(!result.isCancelled) {
                        this.getCurrentLoggedInUser(tracker, type, cb);
                    } else {
                        if(tracker) {
                            tracker.setUser(GA_UNKNOWN_USER);
                        }

                        cb(null, {tracker: tracker, accessToken: null, userInfo: null}, result.isCancelled);
                    }
                }
            });
        } else {
            if(tracker) {
                tracker.setUser(GA_UNKNOWN_USER);
            }

            cb(null, {tracker: tracker, accessToken: null, userInfo: null});
        }
    },

    getCurrentLoggedInUser: function(tracker, type, cb) {
        if(type == AccountTypes.FACEBOOK) {
            FbService.getUserInfo((err, accessToken, userInfo) => {
                if(err) { 
                    if(tracker) {
                        tracker.setUser(GA_UNKNOWN_USER);
                    }
                    
                    cb(err, {tracker: tracker, accessToken: null, userInfo: null});
                } else {
                    // save user
                    this.saveFbUser(userInfo.id, JSON.stringify(userInfo), (err1, savedData) => {
                        if(err1) {
                            if(tracker) {
                                tracker.setUser(GA_UNKNOWN_USER);
                            }

                            cb(err1, {tracker: tracker, accessToken: null, userInfo: null});
                        } else {
                            if(tracker) {
                                tracker.setUser(format(GA_FB_USER_FORMAT, {userId: userInfo.id}));
                            }

                            cb(null, {tracker: tracker, accessToken: accessToken, userInfo: savedData});
                        }
                    });
                }
            });
        } else {
            if(tracker) {
                tracker.setUser(GA_UNKNOWN_USER);
            }

            cb(null, {tracker: tracker, accessToken: null, userInfo: null});
        }
    },

    logOut: function(tracker, type, cb) {
        this.clearUser((error) => {
            if(tracker) {
                tracker.setUser(GA_UNKNOWN_USER);
            }

            if(type == AccountTypes.FACEBOOK) {
                FbService.logOut();
            }

            cb(null, {tracker: tracker});
        });
    },

    loadLoggedInUser: function(tracker, cb) {
        _userRepository.getDefaultUser((error, data) => {
            if(error) { cb(error); }
            else {
                if(data != null) {
                    return this.getCurrentLoggedInUser(tracker, data.type, cb);
                } else {
                    if(tracker) {
                        tracker.setUser(GA_UNKNOWN_USER);
                    }

                    cb(null, {tracker: tracker, accessToken: null, userInfo: null});
                }
            }
        });
    },

    saveFbUser: function(userId, userInfoInString, cb) {
        return _userRepository.getByTypeAndId(AccountTypes.FACEBOOK, userId,  (error, data) => {
            if(error) { cb(error); }
            else {
                if(data && data.id != undefined) {
                    // update
                    _userRepository.update(AccountTypes.FACEBOOK, userId, new User(data.id, data.type, data.userId, userInfoInString, data.isActive), cb);
                } else {
                    // create
                    _userRepository.create(new User(StringUtil.guid(), AccountTypes.FACEBOOK, userId, userInfoInString, true), cb);
                }
            }
        });
    },

    clearUser: function(cb) {
        return _userRepository.deleteAll(cb);
    }
};
  
module.exports = AuthService;