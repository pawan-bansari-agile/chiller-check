FROM node:18.13.0

#RUN apk --no-cache add curl
RUN apt install curl


RUN apt update && apt install -y chromium

####################################
#  Create Directory               #
####################################
RUN mkdir -p /usr/src/app/

###################################
#  Give Permission To Directory   #
##################################
RUN chmod 777 -R /usr/src/app/

###################################
#  Make Working Directory         #
###################################
WORKDIR /usr/src/app

###################################
#Copy Package File To Working Dir.#
###################################
COPY package*.json /usr/src/app/

###################################
#     NPM Package Install         #
###################################
RUN npm install

####################################
#Copy Source Code Into Working Dir.#
####################################
COPY . /usr/src/app
RUN rm -rf .git

####################################
#    Expose 3000 Port              #
####################################
EXPOSE 3000

####################################
#    Start Backend Server          #
####################################
CMD ["npm", "start"]
