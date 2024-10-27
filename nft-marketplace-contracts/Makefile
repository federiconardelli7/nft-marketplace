-include .env

# Default RPC URL if not set in environment
POLYGON_AMOY_RPC_URL ?= https://rpc-amoy.polygon.technology

.PHONY: all test clean deploy copy-abi verify-env update-env

all: clean install build

# Clean the repo
clean:
	forge clean

# Install dependencies
install:
	forge install OpenZeppelin/openzeppelin-contracts

# Build the project
build:
	forge build

# Run tests
test:
	forge test

# Verify environment variables
verify-env:
	@if [ -z "$(PRIVATE_KEY)" ]; then \
		echo "Error: PRIVATE_KEY is not set in .env file"; \
		exit 1; \
	fi

# Strip 0x prefix if present and export
CLEAN_PK = $(subst 0x,,$(PRIVATE_KEY))

# Update .env file with new contract address
update-env:
	@if [ ! -z "$(NEW_ADDRESS)" ]; then \
		echo "Updating CONTRACT_ADDRESS in .env file..."; \
		sed -i.bak '/^CONTRACT_ADDRESS=/d' .env && \
		echo "CONTRACT_ADDRESS=$(NEW_ADDRESS)" >> .env && \
		rm -f .env.bak; \
	fi

# Deploy the contract
deploy: verify-env
	@echo "Deploying to Polygon Amoy..."
	@echo "Using private key (redacted for security, length: $(shell echo $(CLEAN_PK) | wc -c) characters)"
	@echo "Deploying contract..."
	@forge script script/DeployMarketplace.s.sol:DeployMarketplace \
		--rpc-url "$(POLYGON_AMOY_RPC_URL)" \
		--private-key "$(CLEAN_PK)" \
		--broadcast \
		-vvvv \
		| tee deploy_output.txt
	@if grep -q "NFTMarketplace deployed to: " deploy_output.txt; then \
		NEW_ADDRESS=$$(grep "NFTMarketplace deployed to: " deploy_output.txt | awk '{print $$4}') && \
		echo "\nDeployment successful!" && \
		echo "New contract address: $$NEW_ADDRESS" && \
		make update-env NEW_ADDRESS=$$NEW_ADDRESS && \
		make copy-abi && \
		rm deploy_output.txt; \
	elif grep -q "\[Success\].*Contract Address: " deploy_output.txt; then \
		NEW_ADDRESS=$$(grep "\[Success\].*Contract Address: " deploy_output.txt | awk '{print $$NF}') && \
		echo "\nDeployment successful!" && \
		echo "New contract address: $$NEW_ADDRESS" && \
		make update-env NEW_ADDRESS=$$NEW_ADDRESS && \
		make copy-abi && \
		rm deploy_output.txt; \
	else \
		echo "Deployment failed!" && \
		rm deploy_output.txt && \
		exit 1; \
	fi

# Copy ABI to frontend
copy-abi:
	@echo "Copying ABI with contract address: $(CONTRACT_ADDRESS)"
	npm run copy-abi

# Helper target to show current contract address
show-address:
	@echo "Current contract address: $(CONTRACT_ADDRESS)"

# Helper target to show deployment info
deployment-info:
	@echo "Current configuration:"
	@echo "RPC URL: $(POLYGON_AMOY_RPC_URL)"
	@echo "Private key length: $(shell echo $(CLEAN_PK) | wc -c) characters"
	@echo "Current contract address: $(CONTRACT_ADDRESS)"