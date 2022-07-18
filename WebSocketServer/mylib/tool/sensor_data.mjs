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
export class sensor_data{
    constructor(time, tag, id, data){
        this._time = time;
        this._tag  = tag;
        this._id   = id;
        this._data = data;
    }

    jsonify(sensor){
        var json = {
            "time"      : this._time,
            "id"        : this_.id,
            "x"         : sensor._x,
            "y"         : sensor._y,
            "direction" : sensor._direction,
            "data"      : this._data
          };
        return json;
    }
}