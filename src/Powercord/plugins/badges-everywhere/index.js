/*
 * Copyright (c) 2020-2021 Cynthia K. Rey, All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');
const { Plugin } = require('powercord/entities');
const { findInReactTree } = require('powercord/util');

const Settings = require('./components/Settings');
const Badges = require('./components/Badges');

module.exports = class BadgesEverywhere extends Plugin {
  async startPlugin () {
    this.loadStylesheet('style.scss');
    powercord.api.settings.registerSettings('morebadges', {
      category: this.entityID,
      label: 'Badges Everywhere',
      render: Settings
    });

    this.ConnectedBadges = this.settings.connectStore(Badges);

    this._injectMembers();
    this._injectDMs();
    this._injectMessages();
  }

  pluginWillUnload () {
    powercord.api.settings.unregisterSettings('morebadges');
    uninject('morebadges-dm');
    uninject('morebadges-members');
    uninject('morebadges-messages');
  }

  async _injectMembers () {
    const _this = this;
    const MemberListItem = await getModuleByDisplayName('MemberListItem');
    inject('morebadges-members', MemberListItem.prototype, 'renderDecorators', function (args, res) {
      if (!_this.settings.get('members', true)) {
        return res;
      }

      res.props.children.unshift(
        React.createElement('div', { className: `badges` },
          React.createElement(_this.ConnectedBadges, { user: this.props.user })
        )
      );
      return res;
    });
  }

  async _injectDMs () {
    const _this = this;
    const PrivateChannel = await getModuleByDisplayName('PrivateChannel');
    inject('morebadges-dm', PrivateChannel.prototype, 'render', function (args, res) {
      if (!_this.settings.get('dms', true)) {
        return res;
      }
      res.props.name = React.createElement('div', { className: 'badges' }, [
        React.createElement('span', null, res.props.name),
        React.createElement(_this.ConnectedBadges, { user: this.props.user })
      ]);
      return res;
    });
  }

  async _injectMessages () {
    const _this = this;
    const d = (m) => {
      const def = m.__powercordOriginal_default ?? m.default
      return typeof def === 'function' ? def : null
    }

    const MessageAuthorName = await getModule((m) => d(m)?.toString().includes('userOverride'))
    inject('morebadges-messages', MessageAuthorName, 'default', ([ { message: { author }, renderPopout, userOverride } ], res) => {
      if (!_this.settings.get(renderPopout ? 'messages' : 'threads-preview', true)) {
        return res;
      }

      res.props.children.splice(2, 0,
        React.createElement('div', { className: 'badges' },
          React.createElement(this.ConnectedBadges, { user: userOverride || author })
        )
      )

      return res
    })

    return
  }
};
