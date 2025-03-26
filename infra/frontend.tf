# step 8) Create static Web App for frontend
resource "azurerm_static_web_app" "frontend_webapp" {
  depends_on          = [azurerm_linux_web_app.backend_webapp]
  name                = "${local.name_prefix}-echo-brief-frontend-${random_string.unique.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.static_web_location
  tags                = local.default_tags
}

resource "null_resource" "copy_frontend_source_code" {
  provisioner "local-exec" {
    interpreter = var.is_windows ? ["PowerShell", "-Command"] : ["/bin/bash", "-c"]
    command     = var.is_windows ? "Copy-Item -Path ..\\frontend_app -Destination . -Recurse -Force" : "cp -R ../frontend_app ."
    working_dir = path.module
  }
}

# Replace the base name in the apiConstants.ts file
# This works only for Windows, we need to add a null_resource for Linux/macOS
resource "null_resource" "replace_base_name" {
  triggers = {
    base_name = local.base_name
  }
  depends_on = [null_resource.copy_frontend_source_code]

  provisioner "local-exec" {
    interpreter = var.is_windows ? ["PowerShell", "-Command"] : ["/bin/bash", "-c"]
    command     = var.is_windows ? "(Get-Content .\\frontend_app\\lib\\apiConstants.ts) | ForEach-Object { $_ -replace 'BASE_NAME = \"BASE_NAME\"', 'BASE_NAME = \"${local.base_name}\"' } | Set-Content .\\frontend_app\\lib\\apiConstants.ts" : "sed -i 's/BASE_NAME = \"BASE_NAME\"/BASE_NAME = \"${local.base_name}\"/g' ${local.file_path}"
    when        = create
  }
}


# Define local-exec provisioner to run az cli commands
resource "null_resource" "npm_run_build" {
  depends_on = [null_resource.replace_base_name]
  provisioner "local-exec" {
    command     = "npm install --legacy-peer-deps"
    working_dir = "./frontend_app"
  }

  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./frontend_app"
  }
}

resource "time_sleep" "wait_before_start_frontend" {
  depends_on      = [null_resource.npm_run_build]
  create_duration = "360s" # Adjust the time as needed
}

resource "null_resource" "create_deploy_script" {
  triggers = { always_run = "${timestamp()}" }
  provisioner "local-exec" {
    command = <<EOT
      echo swa deploy ./frontend_app/out --env production --deployment-token '${azurerm_static_web_app.frontend_webapp.api_key}' > deploy.bat
    EOT
  }
}

resource "null_resource" "deploy_command" {
  depends_on = [null_resource.create_deploy_script]
  triggers   = { always_run = "${timestamp()}" }
  provisioner "local-exec" {
    command = "swa deploy ./frontend_app/out --env production --deployment-token '${azurerm_static_web_app.frontend_webapp.api_key}'"
  }
}
