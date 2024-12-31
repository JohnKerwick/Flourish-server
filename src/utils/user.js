export const getKeyByValue = (object, value) => Object.keys(object).find((key) => object[key] === value)

export const USER_TYPES = {
  SYS: 'System',
  USR: 'User',
}

export const SYSTEM_STAFF_ROLE = {
  SSA: 'System Admin',
}

export const SYSTEM_USER_ROLE = {
  USR: 'Zeal User',
}

export const getRoleShortName = (userType, role) => {
  if (userType == USER_TYPES.SYS) {
    return Object.keys(SYSTEM_STAFF_ROLE).find((k) => SYSTEM_STAFF_ROLE[k] === role)
  } else {
    return Object.keys(SYSTEM_USER_ROLE).find((k) => SYSTEM_USER_ROLE[k] === role)
  }
}
