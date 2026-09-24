import './index.less';
import { Trans, useTranslation } from 'react-i18next';
import data from './comments.json';
import { Avatar, Flex, theme } from 'antd';

const { useToken } = theme;

export const IntroBlock3 = () => {
  const { t } = useTranslation();

  return (
    <div className="intro-block block-3">
      <div className="community-comments" style={{ textAlign: 'center' }}>
        <Trans i18nKey="intro.community-comments">
          <h1>Trusted by Developers</h1>
          <h3>
            Hear directly from the community
            <br />
            See what PageSpy users say
          </h3>
        </Trans>
        <div className="comments-container">
          {data.map((i) => (
            <Flex key={i.html_url} vertical gap={24}>
              <Flex gap={12} align="center">
                <Avatar
                  size="large"
                  src={i.user.avatar_url}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  {i.user.login.slice(0, 1)}
                </Avatar>
                <b className="username">{i.user.login}</b>
              </Flex>
              <p className="comments-item">{i.body}</p>
            </Flex>
          ))}
        </div>
      </div>
    </div>
  );
};
