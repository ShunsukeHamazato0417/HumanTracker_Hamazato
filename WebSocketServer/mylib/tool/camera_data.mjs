'use strict'

/**************************************
* Library
**************************************/

// Other's libraries

// My libraries
//import {sensor}      from './mylib/tool/sensor.mjs';

/**************************************
* Class
**************************************/
export class camera_data{
    constructor(time, tag, id, data){
        this._time = time;
        this._tag  = tag;
        this._id   = id;
        this._data = data;
    }

    jsonify(camera){
        var json = {
            "time"      : this._time,
            "id"        : this_.id,
            "x"         : camera._x,
            "y"         : camera._y,
            "direction" : camera._direction,
            "data"      : this._data
          };
        return json;
    }
}