const App = require("@live-change/framework")
const validators = require("../validation")
const app = new App()

require('../../i18n/ejs-require.js')
const i18n = require('../../i18n')

const definition = app.createServiceDefinition({
  name: 'readHistory',
  eventSourcing: true,
  validators
})

const config = require('../config/readHistory.js')(app, definition)

const { getAccess, hasRole, checkIfRole, getPublicInfo } =
    require("../access-control-service/access.js")(app, definition)

const User = definition.foreignModel('users', 'User')
const PublicSessionInfo = definition.foreignModel('accessControl', 'PublicSessionInfo')


const ReadHistory = definition.model({
  name: "ReadHistory",
  properties: {
    user: {
      type: User
    },
    publicSessionInfo: {
      type: PublicSessionInfo
    },
    toType: {
      type: String
    },
    toId: {
      type: String
    },
    read: {
      type: String
    },
    last: {
      type: String
    },
    write: {
      type: String
    },
    lastEmailNotification: {
      type: String
    },
    lastSmsNotification: {
      type: String
    }
  },
  indexes: {
    userReadHistory: {
      property: ['user', 'toType', 'toId']
    },
    sessionReadHistory: {
      property: ['publicSessionInfo', 'toType', 'toId']
    },
    userReadHistories: {
      property: ['user', 'last'],
      function: async function(input, output) {
        function mapper(obj) {
          const lastTime = (obj && obj.last && obj.last.split("_").pop()) || ''
          const writeTime = (obj && obj.write && obj.write.split("_").pop()) || ''
          if(obj && obj.user && typeof obj.user != 'string') {
            output.debug('TABLE readHistory_ReadHistory ', obj.id, 'user', JSON.stringify(obj))
            throw new Error("USER IS NOT STRING in "+obj.id+" TYPE ", typeof (obj.user),
                " OBJ "+ JSON.stringify(obj))
          }
          return obj && obj.user && {
            id: `"${obj.user}":"${lastTime > writeTime ? lastTime : writeTime}"_${obj.id}`,
            to: obj.id,
            user: obj.user
          }
        }
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    userReadHistoriesCount: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_userReadHistories')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const user = (obj && obj.user) || (oldObj && oldObj.user)
              if(user && typeof user != 'string') {
                output.debug('INDEX readHistory_ReadHistory_userReadHistories', obj.id, 'user', obj.user)
                throw new Error("USER IS NOT STRING")
              }
              const prefix = `"${user}"`
              const read = await unreadIndex.count({
                gt: prefix + ':',
                lt: prefix + ':\xFF',
                limit: 500
              })
              output.put({
                id: user,
                read
              })
            }
        )
      }
    },
    sessionReadHistories: {
      property: ['publicSessionInfo', 'last'],
      function: async function(input, output) {
        function mapper(obj) {
          const lastTime = (obj && obj.last && obj.last.split("_").pop()) || ''
          const writeTime = (obj && obj.write && obj.write.split("_").pop()) || ''
          return obj && obj.publicSessionInfo && {
            id: `"${obj.publicSessionInfo}":"${lastTime > writeTime ? lastTime : writeTime}"_${obj.id}`,
            to: obj.id,
            session: obj.publicSessionInfo
          }
        }
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    sessionReadHistoriesCount: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_sessionReadHistories')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const session = (obj && obj.session) || (oldObj && oldObj.session)
              const prefix = `"${session}"`
              const read = await unreadIndex.count({
                gt: prefix + ':',
                lt: prefix + ':\xFF',
                limit: 500
              })
              output.put({
                id: session,
                read
              })
            }
        )
      }
    },
    userReadHistoriesByType: {
      property: ['user', 'toType', 'last'],
      function: async function(input, output) {
        function mapper(obj) {
          const lastTime = (obj && obj.last && obj.last.split("_").pop()) || ''
          const writeTime = (obj && obj.write && obj.write.split("_").pop()) || ''
          return obj && obj.user && {
            id: `"${obj.user}"_"${obj.toType}":"${lastTime > writeTime ? lastTime : writeTime}"_${obj.id}`,
            to: obj.id,
            user: obj.user,
            toType: obj.toType
          }
        }
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    userReadHistoriesCountByType: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_userReadHistoriesByType')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const user = (obj && obj.user) || (oldObj && oldObj.user)
              const toType = (obj && obj.toType) || (oldObj && oldObj.toType)
              const prefix = `"${user}"_"${toType}"`
              const read = await unreadIndex.count({
                gt: prefix + ':',
                lt: prefix + ':\xFF',
                limit: 500
              })
              output.put({
                id: user+'_'+toType,
                read
              })
            }
        )
      }
    },
    sessionReadHistoriesByType: {
      property: ['publicSessionInfo', 'toType', 'last'],
      function: async function(input, output) {
        function mapper(obj) {
          const lastTime = (obj && obj.last && obj.last.split("_").pop()) || ''
          const writeTime = (obj && obj.write && obj.write.split("_").pop()) || ''
          return obj && obj.publicSessionInfo && {
            id: `"${obj.publicSessionInfo}"_"${obj.toType}":"${lastTime > writeTime ? lastTime : writeTime}"_${obj.id}`,
            to: obj.id,
            session: obj.publicSessionInfo,
            toType: obj.toType
          }
        }
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    sessionReadHistoriesCountByType: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_sessionReadHistoriesByType')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const session = (obj && obj.session) || (oldObj && oldObj.session)
              const toType = (obj && obj.toType) || (oldObj && oldObj.toType)
              const prefix = `"${session}"_"${toType}"`
              const read = await unreadIndex.count({
                gt: prefix + ':',
                lt: prefix + ':\xFF',
                limit: 500
              })
              output.put({
                id: session+'_'+toType,
                read
              })
            }
        )
      }
    },

    readHistories: {
      property: ['toType', 'toId']
    },

    //*
    userUnreadHistories: {
      property: ['user', 'last', 'read'],
      function: async function(input, output) {
        const mapper =
            (obj) => obj && ((obj.read||'') < (obj.last||'')) && obj.user &&
                ({ id: `${obj.user}_${obj.toType}_${obj.toId}`, user: obj.user, to: obj.id })
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(obj && mapper(obj), oldObj && mapper(oldObj))
        )
      }
    },
    userUnreadHistoriesCount: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_userUnreadHistories')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const user = (obj && obj.user) || (oldObj && oldObj.user)
              const unread = await unreadIndex.count({
                gt: user + '_',
                lt: user + '_\xFF'
              })
              output.put({
                id: user,
                unread
              })
            }
        )
      }
    },
    sessionUnreadHistories: {
      property: ['publicSessionInfo', 'last', 'read'],
      function: async function(input, output) {
        const mapper =
            (obj) => obj && ((obj.read||'') < (obj.last||'')) && obj.publicSessionInfo &&
                ({ id: `${obj.publicSessionInfo}_${obj.toType}_${obj.toId}`, publicSessionInfo: obj.publicSessionInfo, to: obj.id })
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(obj && mapper(obj), oldObj && mapper(oldObj))
        )
      }
    },
    sessionUnreadHistoriesCount: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_sessionUnreadHistories')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const publicSessionInfo = (obj && obj.publicSessionInfo) || (oldObj && oldObj.publicSessionInfo)
              const unread = await unreadIndex.count({
                gt: publicSessionInfo + '_',
                lt: publicSessionInfo + '_\xFF'
              })
              output.put({
                id: publicSessionInfo,
                unread
              })
            }
        )
      }
    },
    userUnreadHistoriesByType: {
      property: ['user', 'last', 'read', 'toType'],
      function: async function(input, output) {
        const mapper =
            (obj) => obj && ((obj.read||'') < (obj.last||'')) && obj.user &&
                ({ id: `${obj.user}_${obj.toType}_${obj.toId}`,
                  user: obj.user, toType: obj.toType, toId: obj.toId })
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(obj && mapper(obj), oldObj && mapper(oldObj))
        )
      }
    },
    userUnreadHistoriesCountByType: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_userUnreadHistoriesByType')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const user = (obj && obj.user) || (oldObj && oldObj.user)
              const toType = (obj && obj.toType) || (oldObj && oldObj.toType)
              const unread = await unreadIndex.count({
                gt: user + '_' + toType + '_',
                lt: user + '_' + toType + '_\xFF'
              })
              output.put({
                id: user + '_' + toType,
                unread
              })
            }
        )
      }
    },
    sessionUnreadHistoriesByType: {
      property: ['publicSessionInfo', 'last', 'read', 'toType'],
      function: async function(input, output) {
        const mapper =
            (obj) => obj && ((obj.read||'') < (obj.last||'')) && obj.publicSessionInfo &&
                ({ id: `${obj.publicSessionInfo}_${obj.toType}_${obj.toId}`,
                  publicSessionInfo: obj.publicSessionInfo, toType: obj.toType, toId: obj.toId })
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(obj && mapper(obj), oldObj && mapper(oldObj))
        )
      }
    },
    sessionUnreadHistoriesCountByType: { /// For counting
      function: async function(input, output) {
        const unreadIndex = await input.index('readHistory_ReadHistory_sessionUnreadHistoriesByType')
        await unreadIndex.onChange(
            async (obj, oldObj) => {
              const publicSessionInfo = (obj && obj.publicSessionInfo) || (oldObj && oldObj.publicSessionInfo)
              const toType = (obj && obj.toType) || (oldObj && oldObj.toType)
              const unread = await unreadIndex.count({
                gt: publicSessionInfo + '_' + toType + '_',
                lt: publicSessionInfo + '_' + toType + '_\xFF'
              })
              output.put({
                id: publicSessionInfo + '_' + toType,
                unread
              })
            }
        )
      }
    },
  }
})

definition.view({
  name: "readHistory",
  properties: {
    toType: {
      type: String
    },
    toId: {
      type: String
    }
  },
  returns: {
    type: ReadHistory
  },
  async daoPath({ toType, toId }, { client, service }, method) {
    if(client.user) {
      return ReadHistory.indexObjectPath('userReadHistory',
          [client.user, toType, toId])
    } else {
      return ReadHistory.indexObjectPath('sessionReadHistory',
          [(await getPublicInfo(client.sessionId)).id, toType, toId])
    }
    /*const id = (client.user ? `user_${client.user}` : `session_${client.sessionId}`)+`_${toType}_${toId}`
    return ReadHistory.path(id)*/
  }
})

definition.view({
  name: "readHistories",
  properties: {
    toType: {
      type: String
    },
    toId: {
      type: String
    }
  },
  returns: {
    type: Array,
    of: {
      type: ReadHistory
    }
  },
  async daoPath({ toType, toId }, { client, service }, method) {
    return ReadHistory.indexRangePath('readHistories', [ toType, toId ])
  }
})

function readHistoriesDaoPath(index, prefix, { gt, lt, gte, lte, limit, reverse }) {
  if(!Number.isSafeInteger(limit)) limit = 100
  function getPrefix(id) {
    if(id === '') return `${prefix}:`
    if(id === '\xFF\xFF\xFF\xFF') return `${prefix}:\xFF\xFF\xFF\xFF`
    return `${prefix}:"${id.match(/":"([0-9-]+T[0-9:]+.[0-9]+Z)"_/)[1]}"_`
  }
  const range = {
    gt: (typeof gt == 'string') ? getPrefix(gt)+"\xFF\xFF\xFF\xFF" : undefined,
    lt: (typeof lt == 'string') ? getPrefix(lt) : undefined,
    gte: (typeof gte == 'string') ? getPrefix(gte) : (typeof gt == 'string' ? undefined : `${prefix}`),
    lte: (typeof lte == 'string')
        ? getPrefix(lte)+"\xFF\xFF\xFF\xFF"
        : (typeof lt == 'string' ? undefined : `${prefix}:\xFF\xFF\xFF\xFF`),
    limit,
    reverse
  }

  const tableName = ReadHistory.tableName

  const path = ['database', 'query',  app.databaseName, `(${
      async (input, output, { tableName, indexName, range }) => {
        if(range.reverse) output.setReverse(true)
        const outputStates = new Map()
        const mapper = async (res) => {
          const obj = (await input.table(tableName).object(res.to).get())
          return obj && ({ ...obj, id: res.id }) || null
        }
        await (await input.index(indexName)).range(range).onChange(async (obj, oldObj) => {
          output.debug("INDEX CHANGE", obj, oldObj)
          if(obj && !oldObj) {
            const data = await mapper(obj)
            output.debug("MAPPED INDEX CHANGE", data, "FROM", obj)
            if(data) output.change(data, null)
          }
          if(obj) {
            let outputState = outputStates.get(obj.id)
            if(!outputState) {
              outputState = { data: undefined, refs: 1 }
              outputState.reader = input.table(tableName).object(obj.to)
              const ind = obj
              outputStates.set(obj.id, outputState)
              outputState.observer = await outputState.reader.onChange(async obj => {
                //output.debug("OBJ CHANGE", obj, "IN INDEX", ind, "REFS", outputState.refs)
                if(outputState.refs <= 0) return
                const data = obj && { ...obj, id: ind.id } || null
                const oldData = outputState.data
                output.change(data, oldData)
                output.debug("READER INDEX CHANGE", data, "FROM", ind.to)
                outputState.data = data || null
              })
            } else if(!oldObj) {
              outputState.refs ++
            }
          } else if(oldObj && oldObj.to) {
            let outputState = outputStates.get(oldObj.id)
            if(outputState) {
              outputState.refs --
              //output.debug("INDEX DELETE", oldObj.id, "REFS", outputState.refs)
              if(outputState.refs <= 0) {
                outputState.reader.unobserve(outputState.observer)
                outputStates.delete(oldObj.id)
                output.change(null, outputState.data)
                output.debug("READER INDEX DELETE FROM", oldObj.to)
              }
            }
          }
        })
      }
  })`, { indexName: tableName+'_'+index, tableName, range }]
  return path
}

definition.view({
  name: "myReadHistories",
  properties: {
    gt: {
      type: String,
    },
    lt: {
      type: String,
    },
    gte: {
      type: String,
    },
    lte: {
      type: String,
    },
    limit: {
      type: Number
    },
    reverse: {
      type: Boolean
    }
  },
  returns: {
    type: Array,
    of: {
      type: ReadHistory
    }
  },
  async daoPath({ gt, lt, gte, lte, limit, reverse }, { client, service }, method) {
    //console.log("READ MY HISTORIES", client.user)
    const [index, prefix] = client.user
        ? ['userReadHistories', `"${client.user}"`]
        : ['sessionReadHistories', `"${(await getPublicInfo(client.sessionId)).id}"`]
    //console.log("COMPUTE RANGE")
    return readHistoriesDaoPath(index, prefix, { gt, lt, gte, lte, limit, reverse })
  }
})

definition.view({
  name: "myReadHistoriesByType",
  properties: {
    toType: {
      type: String,
    },
    gt: {
      type: String,
    },
    lt: {
      type: String,
    },
    gte: {
      type: String,
    },
    lte: {
      type: String,
    },
    limit: {
      type: Number
    },
    reverse: {
      type: Boolean
    }
  },
  returns: {
    type: Array,
    of: {
      type: ReadHistory
    }
  },
  async daoPath({ toType, gt, lt, gte, lte, limit, reverse }, { client, service }, method) {
    //console.log("READ MY HISTORIES", client.user)
    const [index, prefix] = client.user
        ? ['userReadHistoriesByType', `"${client.user}"_"${toType}"`]
        : ['sessionReadHistoriesByType', `"${(await getPublicInfo(client.sessionId)).id}"_"${toType}"`]
    //console.log("COMPUTE RANGE")
    return readHistoriesDaoPath(index, prefix, { gt, lt, gte, lte, limit, reverse })
  }
})

definition.view({
  name: "myReadCount",
  properties: {

  },
  returns: {
    type: Object
  },
  async daoPath({ }, { client, service }, method) {
    const [index, id] = client.user
        ? ['userReadHistoriesCount', `${client.user}`]
        : ['sessionReadHistoriesCount', `${(await getPublicInfo(client.sessionId)).id}`]
    console.log("UNREAD", index, id)
    return ['database', 'indexObject', app.databaseName, 'readHistory_ReadHistory_'+index, id]
  }
})

definition.view({
  name: "myUnreadCount",
  properties: {

  },
  returns: {
    type: Object
  },
  async daoPath({ }, { client, service }, method) {
    const [index, id] = client.user
        ? ['userUnreadHistoriesCount', `${client.user}`]
        : ['sessionUnreadHistoriesCount', `${(await getPublicInfo(client.sessionId)).id}`]
    console.log("UNREAD", index, id)
    return ['database', 'indexObject', app.databaseName, 'readHistory_ReadHistory_'+index, id]
  }
})

definition.view({
  name: "myReadCountByType",
  properties: {
    toType: {
      type: String
    }
  },
  returns: {
    type: Object
  },
  async daoPath({ toType }, { client, service }, method) {
    const [index, id] = client.user
        ? ['userReadHistoriesCountByType', `${client.user}_${toType}`]
        : ['sessionReadHistoriesCountByType', `${(await getPublicInfo(client.sessionId)).id}_${toType}`]
    return ['database', 'indexObject', app.databaseName, 'readHistory_ReadHistory_'+index, id]
  }
})

definition.view({
  name: "myUnreadCountByType",
  properties: {
    toType: {
      type: String
    }
  },
  returns: {
    type: Object
  },
  async daoPath({ toType }, { client, service }, method) {
    const [index, id] = client.user
        ? ['userUnreadHistoriesCountByType', `${client.user}_${toType}`]
        : ['sessionUnreadHistoriesCountByType', `${(await getPublicInfo(client.sessionId)).id}_${toType}`]
    return ['database', 'indexObject', app.databaseName, 'readHistory_ReadHistory_'+index, id]
  }
})

definition.event({
  name: "newEvent",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
    if(user && typeof user != 'string') throw new Error("user is not string", id, 'user = ', user)
    await ReadHistory.update(id, [
      { op: 'reverseMerge', value: { id, user, publicSessionInfo, toType, toId } }, // If not exists
      { op: 'max', property: 'last', value: eventId }
    ])
  }
})

definition.event({
  name: "write",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
    if(user && typeof user != 'string') throw new Error("user is not string", id, 'user = ', user)
    await ReadHistory.update(id, [
      { op: 'reverseMerge', value: { id, user, publicSessionInfo, toType, toId } }, // If not exists
      { op: 'max', property: 'write', value: eventId }
    ])
  }
})

definition.event({
  name: "read",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
    if(user && typeof user != 'string') throw new Error("user is not string", id, 'user = ', user)
    await ReadHistory.update(id, [
      { op: 'reverseMerge', value: { id, user, publicSessionInfo, toType, toId } }, // If not exists
      { op: 'max', property: 'read', value: eventId }
    ])
  }
})

definition.event({
  name: "emailNotification",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
    if(user && typeof user != 'string') throw new Error("user is not string", id, 'user = ', user)
    ReadHistory.update(id, [
      { op: 'reverseMerge', value: { id, user, publicSessionInfo, toType, toId } }, // If not exists
      { op: 'max', property: 'lastEmailNotification', value: eventId }
    ])
  }
})

definition.event({
  name: "smsNotification",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
    if(user && typeof user != 'string') throw new Error("user is not string", id, 'user = ', user)
    ReadHistory.update(id, [
      { op: 'reverseMerge', value: { id, user, publicSessionInfo, toType, toId } }, // If not exists
      { op: 'max', property: 'lastSmsNotification', value: eventId }
    ])
  }
})


definition.trigger({
  name: 'readHistoryEvent',
  properties: {
    toType: {
      type: String
    },
    toId: {
      type: String
    },
    eventId: {
      type: String
    },
    fromUser: {
      type: User
    },
    fromSession: {
      type: PublicSessionInfo
    },
    toUsers: {
      type: Array,
      of: {
        type: User
      }
    },
    toSessions: {
      type: Array,
      of: {
        type: PublicSessionInfo
      }
    }
  },
  waitForEvents: true,
  queuedBy: ['user', 'toType', 'fromUser', 'fromSession'],
  async execute({ fromUser, fromSession, toUsers, toSessions, toType, toId, eventId }, { service }, emit) {
    const readHistory = fromUser
        ? await ReadHistory.indexObjectGet('userReadHistory', [fromUser, toType, toId])
        : await ReadHistory.indexObjectGet('sessionReadHistory', [fromSession, toType, toId])
    emit({
      type: 'write',
      user: fromUser,
      publicSessionInfo: (!fromUser && fromSession) || undefined,
      toType, toId, eventId
    })
    for(const session of toSessions) {
      emit({
        type: 'newEvent',
        publicSessionInfo: session,
        toType, toId, eventId
      })
    }
    for(const user of toUsers) {
      emit({
        type: 'newEvent',
        user: user,
        toType, toId, eventId
      })
    }
    const lastWriteTime = (readHistory && readHistory.last) ? new Date(readHistory.last.split('_').pop()) : new Date(0)
    const emailNotification = lastWriteTime.getTime() + (config.emailNotificationDelay - 10000)
    const emailNotificationTimestamp = Date.now() + config.emailNotificationDelay + config.emailNotificationCheckDelay
    for(const user of toUsers) {
      console.log("NEW EVENT")
      if(emailNotification && config.emails[toType]) {
        console.log("CREATE TIMER")
        await app.trigger({
          type: 'createTimer',
          timer: {
            timestamp: emailNotificationTimestamp,
            service: 'readHistory',
            trigger: {
              type: 'checkEmailNotificationState',
              user, toType, toId
            }
          }
        })
        console.log("TIMER CREATED")
      }
    }

    const smsNotification = lastWriteTime.getTime() + (config.smsNotificationDelay - 10000)
    const smsNotificationTimestamp = Date.now() + config.smsNotificationDelay + config.smsNotificationCheckDelay
    for(const user of toUsers) {
      console.log("NEW EVENT")
      if(smsNotification && config.sms[toType]) {
        console.log("CREATE TIMER", (new Date(smsNotificationTimestamp)).toISOString())
        await app.trigger({
          type: 'createTimer',
          timer: {
            timestamp: smsNotificationTimestamp,
            service: 'readHistory',
            trigger: {
              type: 'checkSmsNotificationState',
              user, toType, toId
            }
          }
        })
        console.log("TIMER CREATED")
      }
    }
  }
})

definition.trigger({
  name: 'checkEmailNotificationState',
  properties: {
    user: {
      type: User
    },
    toType: {
      type: String
    },
    toId: {
      type: String
    }
  },
  waitForEvents: true,
  queuedBy: ['user', 'toType', 'toId'],
  async execute({ user, toType, toId }, { service }, emit) {
    console.log("STARTED EMAIL CHECK!", user, toType, toId)
    const readHistory =  await ReadHistory.indexObjectGet('userReadHistory', [user, toType, toId])
    if(readHistory.lastEmailNotification > readHistory.last) return // already notified about everything

    console.log("GOT READ HISTORY!", readHistory.lastEmailNotification)

    const result = await config.emails[toType](readHistory)

    if(typeof result == 'object') {
      const { email, lastSent } = result
      console.log("SENDING EMAIL!")
      //console.log("NOTIFICATION EMAIL", email)
      emit({
        type: "emailNotification",
        user, toType, toId, eventId: lastSent
      })
      await service.trigger({
        type:"sendEmail",
        email
      })
      console.log("EMAIL SENT!")
    } else {
      console.log("NO EMAIL NEEDED!")
    }
  }
})

definition.trigger({
  name: 'checkSmsNotificationState',
  properties: {
    user: {
      type: User
    },
    toType: {
      type: String
    },
    toId: {
      type: String
    }
  },
  waitForEvents: true,
  queuedBy: ['user', 'toType', 'toId'],
  async execute({ user, toType, toId }, { service }, emit) {
    console.log("STARTED SMS CHECK!", user, toType, toId)
    const readHistory =  await ReadHistory.indexObjectGet('userReadHistory', [user, toType, toId])
    if(readHistory.lastSmsNotification > readHistory.last) return // already notified about everything

    console.log("GOT READ HISTORY!", readHistory.lastSmsNotification)

    const result = await app.assertTime("generate sms", 5000,
        () => config.sms[toType](readHistory), toType, readHistory)

    console.log("GENERATED SMS", result)

    if(typeof result == 'object') {
      const { sms, lastSent } = result
      console.log("SENDING SMS!")
      //console.log("NOTIFICATION SMS", sms)
      emit({
        type: "smsNotification",
        user, toType, toId, eventId: lastSent
      })
      const phone = sms.phone.replace(/[ -]/g,'').replace(/^0/,'+')
      await service.trigger({
        type:"sendSms",
        smsId: app.generateUid(),
        phone,
        text: sms.text
      })
      console.log("SMS SENT!")
    } else {
      console.log("NO SMS NEEDED!")
    }
  }
})

definition.action({
  name: "read",
  properties: {
    toType: {
      type: String
    },
    toId: {
      type: String
    },
    eventId: {
      type: String
    }
  },
  async execute({ toType, toId, eventId }, { client, service }, emit) {
    emit({
      type: 'read',
      user: client.user,
      publicSessionInfo: (!client.user && (await getPublicInfo(client.sessionId)).id) || undefined,
      toType, toId, eventId
    })
  }
})

module.exports = definition

async function start () {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  })

  app.processServiceDefinition(definition, [...app.defaultProcessors])
  await app.updateService(definition)//, { force: true })
  const service = await app.startService(definition, { runCommands: true, handleEvents: true })

  /*require("../config/metricsWriter.js")(definition.name, () => ({

  }))*/
}

if (require.main === module) {
  start().catch(error => {
    console.error(error)
    process.exit(1)
  })
}


