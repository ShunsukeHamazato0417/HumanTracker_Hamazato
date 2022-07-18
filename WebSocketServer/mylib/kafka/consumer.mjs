'use strict'

/**************************************
* Library
**************************************/

// Other's libraries
import { ConsumerGroup } from 'kafka-node';
 
// My libraries

/**************************************
* Class
**************************************/
export class consumer{
    constructor(bootstrap_servers, datatype, topics, groupID){
        this._datatype = datatype;
        this._groupID = groupID;
        this._topics = topics;
        this._bootstrap_servers = bootstrap_servers;
    }

    _consumer(){
        this._option = {
            kafkaHost: this._bootstrap_servers,
            groupId : this._groupID,
            autoCommit : false,
            protocol : ['roundrobin'],
                fromOffset : 'latest',
            encoding : 'utf8', 
                commitOffsetsOnFirstJoin : true,
                outOfRangeOffset: 'latest'
        }

        return new ConsumerGroup(Object.assign({ id : 'wsserver-'+this._datatype }, this._option), this._topics);
    }

}
