ui            = false
# Désactivation de mlock requise avec read_only: true + no-new-privileges:true ;
# prérequis production : swap désactivé ou chiffré sur l'hôte Linux.
disable_mlock = true

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
  telemetry {
    unauthenticated_metrics_access = true
  }
}

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}

api_addr = "http://vault:8200"
