import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { ApiService } from '../services/api.service';
import { GlobalService } from '../global.service';
import { AuthService } from '../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ChallengeService } from '../services/challenge.service';
@Component({
  selector: 'app-teamlist',
  templateUrl: './teamlist.component.html',
  styleUrls: ['./teamlist.component.scss']
})
export class TeamlistComponent implements OnInit {
  authServicePublic: any;
  routerPublic: any;
  allTeams = [];
  filteredTeams = [];
  private filteredTeamSource = new BehaviorSubject(this.filteredTeams);
  filteredTeamsObservable = this.filteredTeamSource.asObservable();
  
  seeMore = 1;
  windowSize = 2;
  teamSelectTitle = "";
  teamCreateTitle = "";
  teamCreateButton = "";
  isHost = false;
  isOnChallengePage = false;
  fetchTeamsPath: any;
  createTeamsPath: any;
  deleteTeamsPath: any;
  selectedTeam: any = null;
  challenge: any;
  teamForm = 'formteam';
  @ViewChildren('formteam')
  components: QueryList<TeamlistComponent>;
  constructor(private apiService: ApiService,
              private authService: AuthService,
              private globalService: GlobalService,
              private router: Router,
              private route: ActivatedRoute,
              private challengeService: ChallengeService) { }

  ngOnInit() {
    if (this.router.url === '/teams/hosts') {
      this.isHost = true;
      this.fetchTeamsPath = 'hosts/challenge_host_team';
      this.createTeamsPath = 'hosts/create_challenge_host_team';
      this.deleteTeamsPath = 'hosts/remove_self_from_challenge_host';
      this.fetchMyTeams(this.fetchTeamsPath);
      this.teamCreateTitle = "Create a New Team";
      this.teamSelectTitle = "Select a Challenge Host Team";
      this.teamCreateButton = "Create Host Team";
    } else {
      if (this.router.url !== '/teams/participants') {
        this.isOnChallengePage = true;
        this.challengeService.currentChallenge.subscribe(challenge => this.challenge = challenge);
      }
      this.fetchTeamsPath = 'participants/participant_team';
      this.createTeamsPath = this.fetchTeamsPath;
      this.deleteTeamsPath = 'participants/remove_self_from_participant_team';
      this.fetchMyTeams(this.fetchTeamsPath);
      this.teamCreateTitle = "Create a New Participant Team";
      this.teamSelectTitle = "My Existing Participant Teams";
      this.teamCreateButton = "Create Participant Team";
    }
    this.authServicePublic = this.authService;
    this.routerPublic = this.router;
  }

  seeMoreClicked() {
    this.seeMore = this.seeMore + 1;
    this.updateTeamsView(false);
  }

  updateTeamsView(reset) {
    if (reset) {
      this.seeMore = 1;
    }
    this.filteredTeams = this.allTeams.slice(0, (this.seeMore * this.windowSize));
    this.filteredTeamSource.next(this.filteredTeams);
  }

  fetchMyTeams(path) {
  	if (this.authService.isLoggedIn()) {
      this.fetchTeams(path);
  	}
  }

  selectTeamWrapper() {
    const SELF = this;
  	let selectTeam = (team) => {
      SELF.selectedTeam = team;
      SELF.unselectOtherTeams(SELF);
  	};
  	return selectTeam;
  }

  unselectOtherTeams(self) {
    let temp = self.allTeams.slice();
    for (let i = 0; i < temp.length; i++) {
      temp[i]['isSelected'] = false;
      if (self.selectedTeam['id'] === temp[i]['id']) {
      	temp[i]['isSelected'] = true;
      }
    }
    self.allTems = temp;
  	self.updateTeamsView(false);
  }

  appendIsSelected(teams) {
  	for (let i = 0; i < teams.length; i++) {
  		teams[i]['isSelected'] = false;
  		teams[i]['isHost'] = true;
  	}
  	return teams;
  }


  fetchTeams(path) {
    const SELF = this;
    this.apiService.getUrl(path).subscribe(
      data => {
        if (data['results']) {
          SELF.allTeams = data['results'];
          if (SELF.isHost || SELF.isOnChallengePage) {
            SELF.allTeams = SELF.appendIsSelected(SELF.allTeams);
          }
          SELF.updateTeamsView(true);
        }
      },
      err => {
        SELF.globalService.handleApiError(err, false);
      },
      () => {
        console.log('Teams fetched', path);
      }
    );
  }

  deleteTeamWrapper() {
  	const SELF = this;
    let deleteTeam = (e) => {
      let apiCall = ()=> {
        SELF.apiService.deleteUrl(SELF.deleteTeamsPath + '/' + e).subscribe(
        data => {
          // Success Message in data.message
          SELF.globalService.showToast('success', 'You were removed from the team!', 5);
          SELF.fetchMyTeams(SELF.fetchTeamsPath);
          SELF.selectedTeam = null;
        },
        err => {
          SELF.globalService.handleApiError(err);
        },
        () => console.log('DELETE-TEAM-FINISHED')
        );
      };
      const PARAMS = {
        title: 'Would you like to remove yourself ?',
        content: 'Note: This action will remove you from the team.',
        confirm: 'Yes',
        deny: 'Cancel',
        confirmCallback: apiCall
      };
      SELF.globalService.showConfirm(PARAMS);
      return false;
  	};
  	return deleteTeam;
  }
  
  createTeam(formname) {
  	this.globalService.formValidate(this.components, this.createTeamSubmit, this);
  }
  createTeamSubmit(self) {
  	const API_PATH = self.createTeamsPath;
  	let url = self.globalService.formValueForLabel(self.components, 'team_url');
    let TEAM_BODY: any = {
      team_name: self.globalService.formValueForLabel(self.components, 'team_name') 
    };
    if (url) {
      TEAM_BODY['team_url'] = url;
  	}
    TEAM_BODY = JSON.stringify(TEAM_BODY);
    self.apiService.postUrl(API_PATH, TEAM_BODY).subscribe(
      data => {
        // Success Message in data.message
        self.globalService.showToast('success', 'Team created successfully!', 5);
        self.fetchMyTeams(self.fetchTeamsPath);
      },
      err => {
        self.globalService.handleFormError(self.components, err);
      },
      () => console.log('CREATE-TEAM-FINISHED')
    );
  }

  createChallenge() {

  }

  participateInChallenge() {
    this.challengeService.participateInChallenge(this.challenge['id'], this.selectedTeam['id']);
  }

}
