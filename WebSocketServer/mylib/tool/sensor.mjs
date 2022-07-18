'use strict'

/**************************************
* Library
**************************************/

// Other's libraries

// My libraries

/**************************************
* Class
**************************************/
export class sensor{
    constructor(id, ip, x, y, direction){
        this._id = id;
        this._ip = ip;
        this._x = x;
        this._y = y;
        this._direction = direction;
    }
}