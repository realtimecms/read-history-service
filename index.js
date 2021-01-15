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

const unreadHistoriesIndexFunction = async function(input, output, { idFunction }) {
  const getId = eval(idFunction)
  await input.table('readHistory_ReadHistory').onChange((obj, oldObj) => {
    const id = obj ? getId(obj) : getId(oldObj)
    const oldUnread = !!(oldObj && (oldObj.read||'') < (oldObj.last||''))
    const unread = !!(obj && (obj.read||'') < (obj.last||''))
    if(!id) return
    if(unread != oldUnread) {
      if(unread) {
        output.update(id, [
          { op: "addToSet", property: 'unread', value: obj.id }
        ])
      } else {
        output.update(id, [
          { op: "deleteFromSet", property: 'unread', value: obj.id }
        ])
      }
    }
    const oldUnanswered = !!(oldObj && (oldObj.write||'') > (oldObj.last||''))
    const unanswered = !!(obj && (obj.write||'') > (obj.last||''))
    if(unanswered != oldUnanswered) {
      if(unread) {
        output.update(id, [
          { op: "addToSet", property: 'unanswered', value: obj.id }
        ])
      } else {
        output.update(id, [
          { op: "deleteFromSet", property: 'unanswered', value: obj.id }
        ])
      }
    }
  })
}

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
          return obj && { id: `"${obj.user}":"${lastTime > writeTime ? lastTime : writeTime}"_${obj.id}`, to: obj.id  }
        }
        await input.table('readHistory_ReadHistory').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    sessionReadHistories: {
      property: ['publicSessionInfo', 'last']
    },
    userReadHistoriesByType: {
      property: ['user', 'toType', 'last']
    },
    sessionReadHistoriesByType: {
      property: ['publicSessionInfo', 'toType', 'last']
    },
    readHistories: {
      property: ['toType', 'toId']
    },

    //*
    userUnreadHistoriesIds: { /// For counting
      function: unreadHistoriesIndexFunction,
      parameters: {
        idFunction: `(${(obj => obj.user)})`
      }
    },
    sessionUnreadHistoriesIds: { /// For Counting
      function: unreadHistoriesIndexFunction,
      parameters: {
        idFunction: `(${(obj => obj.publicSessionInfo)})`
      }
    },
    userUnreadHistoriesIdsByType: { /// For counting
      function: unreadHistoriesIndexFunction,
      parameters: {
        idFunction: `(${(obj => `${obj.user}_${obj.toType}`)})`
      }
    },
    sessionUnreadHistoriesIdsByType: { /// For Counting
      function: unreadHistoriesIndexFunction,
      parameters: {
        idFunction: `(${(obj => `${obj.publicSessionInfo}_${obj.toType}`)})`
      }
    },

    userUnreadHistoriesCount: { /// For counting
      function: async function(input, output) {
        function mapper(obj) {
          return obj && { id: obj.id,
            unread: obj.unread && obj.unread.length || 0,
            unanswered: obj.unanswered && obj.unanswered.length || 0
          }
        }
        await input.index('readHistory_ReadHistory_userUnreadHistoriesIds').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    sessionUnreadHistoriesCount: { /// For Counting
      function: async function(input, output) {
        function mapper(obj) {
          return obj && { id: obj.id,
            unread: obj.unread && obj.unread.length || 0,
            unanswered: obj.unanswered && obj.unanswered.length || 0
          }
        }
        await input.index('readHistory_ReadHistory_sessionUnreadHistoriesIds').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    userUnreadHistoriesCountByType: { /// For counting
      function: async function(input, output) {
        function mapper(obj) {
          return obj && { id: obj.id,
            unread: obj.unread && obj.unread.length || 0,
            unanswered: obj.unanswered && obj.unanswered.length || 0
          }
        }
        await input.index('readHistory_ReadHistory_userUnreadHistoriesIdsByType').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    },
    sessionUnreadHistoriesCountByType: { /// For Counting
      function: async function(input, output) {
        function mapper(obj) {
          return obj && { id: obj.id,
            unread: obj.unread && obj.unread.length || 0,
            unanswered: obj.unanswered && obj.unanswered.length || 0
          }
        }
        await input.index('readHistory_ReadHistory_sessionUnreadHistoriesIdsByType').onChange(
            (obj, oldObj) => output.change(mapper(obj), mapper(oldObj))
        )
      }
    }//*/

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
          const mapper = async (res) => ({ ...(await input.table(tableName).object(res.to).get()), id: res.id })
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
                  const data = { ...obj, id: ind.id }
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

   /* const histories = await app.dao.get(path)
    console.log("HISTORIES RANGE SRC", { gt, lt, gte, lte, limit, reverse }, "TO", range,
        "RESULTS", histories.length, histories.map(h => h.id))
    return null
    console.log("HISTORIES RANGE PATH", JSON.stringify(path))
    app.dao.observable(path).observe((signal, value ) => {
      if(signal == 'set') {
        if(value.length !=  histories.length) console.error("WRONG OBSERVABLE SET!", value, histories)
        console.log("HISTORIES RANGE SRC", { gt, lt, gte, lte, limit, reverse }, "TO", range,
            "SET", value.length, value.map(h => h.id))
      }
    })*/
    return path
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
    const [index, prefix] = client.user
        ? ['userReadHistoriesByType', `"${client.user}"_"${toType}"`]
        : ['sessionReadHistoriesByType', `"${(await getPublicInfo(client.sessionId)).id}"_"${toType}"`]
    if(!Number.isSafeInteger(limit)) limit = 100
    const range = {
      gt: gt ? `${prefix}:"${gt.split('_').pop()}"` : (gte ? undefined : `${prefix}:`),
      lt: lt ? `${prefix}:"${lt.split('_').pop()}"` : undefined,
      gte: gte ? `${prefix}:"${gte.split('_').pop()}"` : undefined,
      lte: lte ? `${prefix}:"${lte.split('_').pop()}"\xFF` : ( lt ? undefined : `${prefix}:\xFF\xFF\xFF\xFF`),
      limit,
      reverse
    }
    /*console.log("HISTORIES RANGE", range)
    const histories = await ReadHistory.indexRangeGet(index, range)
    console.log("HISTORIES RANGE", range, "RESULTS", histories.length)*/
    return ReadHistory.indexRangePath(index, range)
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
        ? ['userReadHistoriesCountByType', `${client.user}_${toType}`]
        : ['sessionReadHistoriesCountByType', `${(await getPublicInfo(client.sessionId)).id}_${toType}`]
    return ['database', 'indexObject', app.databaseName, 'readHistory_ReadHistory_'+index, id]
  }
})

definition.event({
  name: "newEvent",
  async execute({ user, publicSessionInfo, toType, toId, eventId }) {
    const id = (user ? `user_${user}` : `session_${publicSessionInfo}`) + `_${toType}_${toId}`
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


