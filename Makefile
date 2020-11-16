up:
	docker-compose up -d redis postgres s3
	yarn install --pure-lockfile
	yarn sequelize db:migrate
	yarn dev

build:
	docker-compose build --pull outline

test:
	docker-compose up -d redis postgres s3
	yarn sequelize db:drop --env=test
	yarn sequelize db:create --env=test
	yarn sequelize db:migrate --env=test
	yarn test

deploy:
	docker build . --tag outline
	aws ecr get-login-password --region eu-west-3 --profile koji | docker login --username AWS --password-stdin 085158381807.dkr.ecr.eu-west-3.amazonaws.com
	docker tag outline:latest 085158381807.dkr.ecr.eu-west-3.amazonaws.com/outline:latest
	docker push 085158381807.dkr.ecr.eu-west-3.amazonaws.com/outline:latest

watch:
	docker-compose up -d redis postgres s3
	yarn sequelize db:drop --env=test
	yarn sequelize db:create --env=test
	yarn sequelize db:migrate --env=test
	yarn test:watch

destroy:
	docker-compose stop
	docker-compose rm -f

.PHONY: up build deploy destroy test watch # let's go to reserve rules names
