// DNS patch for local router DNS cache delay
if (typeof window === 'undefined') {
  try {
    const dns = require('dns')
    const originalLookup = dns.lookup
    dns.lookup = (
      hostname: string,
      options: any,
      callback: (err: any, address?: any, family?: any) => void
    ) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      if (hostname === 'wkkldshtmroixtcxrtog.supabase.co') {
        if (options && options.all) {
          return callback(null, [{ address: '104.18.38.10', family: 4 }])
        }
        return callback(null, '104.18.38.10', 4)
      }
      return originalLookup(hostname, options, callback)
    }
  } catch {
    // Ignore in edge runtime
  }
}
