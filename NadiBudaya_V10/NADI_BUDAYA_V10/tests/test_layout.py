import unittest
from pathlib import Path


class CameraLayoutRegressionTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1]
        self.html = (self.root / "app" / "static" / "index.html").read_text(encoding="utf-8")
        self.css = (self.root / "app" / "static" / "styles.css").read_text(encoding="utf-8")

    def test_record_buttons_are_inside_camera_panel_not_guide_column(self):
        camera_panel_start = self.html.index('class="panel camera-panel')
        guide_column_start = self.html.index('class="stage-v8-guide-column')
        record_start = self.html.index('id="stageRecordStart"')
        record_stop = self.html.index('id="stageRecordStop"')
        self.assertGreater(record_start, camera_panel_start)
        self.assertLess(record_start, guide_column_start)
        self.assertGreater(record_stop, camera_panel_start)
        self.assertLess(record_stop, guide_column_start)

    def test_record_buttons_exist_only_once(self):
        self.assertEqual(self.html.count('id="stageRecordStart"'), 1)
        self.assertEqual(self.html.count('id="stageRecordStop"'), 1)

    def test_v9_tutorial_uses_selected_30_second_clip_and_logo(self):
        self.assertIn('id="danceClipStart"', self.html)
        self.assertIn('start=0&end=30', self.html)
        self.assertIn('id="applyDanceClip"', self.html)
        self.assertIn('/static/nadi-budaya-emblem.png', self.html)
        self.assertIn('id="cameraGroupMode"', self.html)

    def test_tutorial_column_does_not_use_sticky_or_internal_scroll(self):
        rules = self.css[self.css.rfind('.v81-guide-column{'):]
        self.assertIn('position:static!important', rules)
        self.assertIn('overflow:visible!important', rules)
        self.assertIn('max-height:none!important', rules)


if __name__ == "__main__":
    unittest.main()
